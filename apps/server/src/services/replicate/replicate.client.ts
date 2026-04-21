import Replicate from "replicate";
import { config } from "@server/config";
import { logger } from "@server/lib/logger";

const MODEL = "black-forest-labs/flux-dev";
const DEFAULT_TIMEOUT_MS = 60_000;

const client = new Replicate({
	auth: config.replicateApiToken,
});

export type ReplicateErrorCode =
	| "timeout"
	| "generation_failed"
	| "insufficient_credit"
	| "rate_limited";

export class ReplicateError extends Error {
	public readonly originalError?: unknown;
	public readonly code?: ReplicateErrorCode;
	constructor(
		message: string,
		originalError?: unknown,
		code?: ReplicateErrorCode,
	) {
		super(message);
		this.name = "ReplicateError";
		this.originalError = originalError;
		this.code = code;
	}
}

function errorMessageText(err: unknown): string {
	return err instanceof Error ? err.message : typeof err === "string" ? err : "";
}

function isInsufficientCreditError(err: unknown): boolean {
	const msg = errorMessageText(err);
	return /402|insufficient credit|payment required/i.test(msg);
}

function isRateLimitedError(err: unknown): boolean {
	const msg = errorMessageText(err);
	return /429|too many requests|rate limit|throttled/i.test(msg);
}

type GenerateOptions = {
	count?: number; // 1 or 2
	aspectRatio?: "1:1" | "16:9" | "9:16" | "4:5";
	timeoutMs?: number;
};

/**
 * Extract string URLs from Replicate's varied output shapes.
 * flux-dev may return: string, string[], FileOutput[], or a ReadableStream.
 */
function extractUrls(raw: unknown): string[] {
	if (!raw) return [];
	if (typeof raw === "string") return [raw];
	if (Array.isArray(raw)) {
		return raw
			.map((item) => {
				if (typeof item === "string") return item;
				// FileOutput instance from replicate SDK has .url()
				if (item && typeof item === "object" && "url" in item) {
					const u = (item as { url?: unknown }).url;
					if (typeof u === "function") {
						try {
							const result = (u as () => unknown).call(item);
							return result instanceof URL
								? result.toString()
								: typeof result === "string"
									? result
									: "";
						} catch {
							return "";
						}
					}
					if (typeof u === "string") return u;
					if (u instanceof URL) return u.toString();
				}
				return "";
			})
			.filter((s): s is string => Boolean(s));
	}
	return [];
}

export async function generateImages(
	prompt: string,
	options: GenerateOptions = {},
): Promise<string[]> {
	const { count = 2, aspectRatio = "1:1", timeoutMs = DEFAULT_TIMEOUT_MS } = options;
	const startedAt = Date.now();

	const runPromise = client.run(MODEL, {
		input: {
			prompt,
			num_outputs: Math.min(Math.max(count, 1), 2),
			aspect_ratio: aspectRatio,
			output_quality: 90,
			output_format: "webp",
			num_inference_steps: 28,
		},
	});

	const timeoutPromise = new Promise<never>((_, reject) => {
		setTimeout(
			() =>
				reject(
					new ReplicateError("Replicate request timed out", undefined, "timeout"),
				),
			timeoutMs,
		);
	});

	try {
		const raw = await Promise.race([runPromise, timeoutPromise]);
		const urls = extractUrls(raw);
		if (urls.length === 0) {
			logger.error({ msg: "replicate returned no URLs", raw: String(raw) });
			throw new ReplicateError(
				"Replicate returned no image URLs",
				undefined,
				"generation_failed",
			);
		}
		logger.info({
			msg: "replicate: success",
			count: urls.length,
			latencyMs: Date.now() - startedAt,
		});
		return urls;
	} catch (error) {
		if (error instanceof ReplicateError) throw error;
		if (isInsufficientCreditError(error)) {
			logger.error({
				msg: "replicate: insufficient credit",
				error: errorMessageText(error),
			});
			throw new ReplicateError(
				"Replicate account has insufficient credit",
				error,
				"insufficient_credit",
			);
		}
		if (isRateLimitedError(error)) {
			logger.warn({
				msg: "replicate: rate limited",
				error: errorMessageText(error),
			});
			throw new ReplicateError(
				"Replicate rate limit hit",
				error,
				"rate_limited",
			);
		}
		logger.error({
			msg: "replicate request failed",
			error: errorMessageText(error),
		});
		throw new ReplicateError(
			"Replicate request failed",
			error,
			"generation_failed",
		);
	}
}
