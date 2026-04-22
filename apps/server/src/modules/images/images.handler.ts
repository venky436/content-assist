import type { RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "@server/middleware/auth.middleware";
import {
	generateImagesResponseSchema,
	type SceneType,
} from "@content-assist/shared";
import { logger } from "@server/lib/logger";
import { GeminiError, generateJson } from "@server/services/gemini";
import { ReplicateError, generateImages } from "@server/services/replicate";
import { mirrorUrlToS3, storage } from "@server/services/storage";
import {
	IMAGE_PROMPT_SYSTEM,
	buildImagePrompt,
} from "@server/modules/images/images.prompt";
import type {
	generateImagesRoute,
	regenerateImagesRoute,
} from "@server/modules/images/images.schema";

/**
 * Mirror a Replicate CDN URL into our S3 bucket and return a durable
 * presigned GET alongside the S3 objectKey. Returns `null` on mirror failure
 * so the caller can fall back to the raw Replicate URL (the post is fragile
 * in that case, but the generation isn't wasted).
 */
async function mirrorReplicateImage(
	replicateUrl: string,
	userId: string,
): Promise<{ url: string; objectKey: string } | null> {
	const objectKey = storage.buildKey({
		prefix: "generated-images",
		userId,
		ext: "webp",
	});
	try {
		await mirrorUrlToS3(replicateUrl, objectKey, "image/webp");
		const { url } = await storage.presignGet({ key: objectKey });
		return { url, objectKey };
	} catch (err) {
		logger.warn({
			msg: "images: S3 mirror failed, falling back to raw Replicate URL",
			error: err instanceof Error ? err.message : String(err),
			objectKey,
		});
		return null;
	}
}

const GEMINI_TIMEOUT_MS = 10_000;
const MAX_SCENE_PROMPT_LEN = 500;
const MAX_LABEL_LEN = 40;
const DEFAULT_COUNT = 3;
const REPLICATE_RETRY_DELAY_MS = 11_000;
const REPLICATE_MAX_RETRIES = 1;

/**
 * Appended to every Gemini-generated scene prompt before it goes to Replicate.
 * Guarantees production-grade look regardless of what Gemini wrote for lighting/style.
 */
const QUALITY_SUFFIX =
	"cinematic lighting, ultra realistic, sharp focus, depth of field, professional photography, 4k detail";

function withQualitySuffix(prompt: string): string {
	// Trim trailing punctuation before appending so the suffix reads cleanly.
	const trimmed = prompt.trim().replace(/[.,;:\s]+$/g, "");
	return `${trimmed}, ${QUALITY_SUFFIX}`;
}

type Scene = {
	sceneType: SceneType;
	label: string;
	prompt: string;
};

type SceneExtract = {
	who?: string;
	problem?: string;
	context?: string;
	scenes: Scene[];
};

const VALID_SCENE_TYPES: readonly SceneType[] = ["struggle", "decision", "result"];

function isSceneType(v: unknown): v is SceneType {
	return typeof v === "string" && (VALID_SCENE_TYPES as string[]).includes(v);
}

function sanitizeScenes(raw: unknown): SceneExtract | null {
	if (typeof raw !== "object" || raw === null) return null;
	const record = raw as Record<string, unknown>;
	const scenesRaw = record.scenes;
	if (!Array.isArray(scenesRaw)) return null;

	const scenesByType = new Map<SceneType, Scene>();
	for (const entry of scenesRaw) {
		if (!entry || typeof entry !== "object") continue;
		const e = entry as Record<string, unknown>;
		const sceneType = e.sceneType ?? e.type;
		const label = typeof e.label === "string" ? e.label.trim() : "";
		const prompt = typeof e.prompt === "string" ? e.prompt.trim() : "";
		if (!isSceneType(sceneType) || !prompt || !label) continue;
		if (scenesByType.has(sceneType)) continue;
		scenesByType.set(sceneType, {
			sceneType,
			label: label.slice(0, MAX_LABEL_LEN),
			prompt: prompt.slice(0, MAX_SCENE_PROMPT_LEN),
		});
	}
	if (scenesByType.size === 0) return null;

	// Order: struggle → decision → result
	const ordered: Scene[] = [];
	for (const type of VALID_SCENE_TYPES) {
		const s = scenesByType.get(type);
		if (s) ordered.push(s);
	}

	return {
		who: typeof record.who === "string" ? record.who.trim() : undefined,
		problem: typeof record.problem === "string" ? record.problem.trim() : undefined,
		context: typeof record.context === "string" ? record.context.trim() : undefined,
		scenes: ordered,
	};
}

async function enhanceScenes(input: {
	idea: string;
	caption?: string;
	modifier?: string;
}): Promise<SceneExtract> {
	const prompt = buildImagePrompt(input);
	const raw = await generateJson(prompt, {
		timeoutMs: GEMINI_TIMEOUT_MS,
		systemInstruction: IMAGE_PROMPT_SYSTEM,
	});
	const extracted = sanitizeScenes(raw);
	if (!extracted) {
		throw new Error("scene extraction failed: invalid JSON shape");
	}
	return extracted;
}

/**
 * Select scenes to render. If `sceneTypes` is provided (regenerate flow), keep exactly those.
 * Otherwise, pick by count:
 *   count=2 → struggle + result (skip decision)
 *   count=3 → struggle + decision + result (all)
 */
function pickScenesToRender(
	scenes: Scene[],
	count: number,
	sceneTypes?: SceneType[],
): Scene[] {
	if (sceneTypes && sceneTypes.length > 0) {
		const want = new Set(sceneTypes);
		return scenes.filter((s) => want.has(s.sceneType));
	}
	if (count >= 3) return scenes.slice(0, 3);
	// count = 2 → struggle + result (skip decision)
	const struggle = scenes.find((s) => s.sceneType === "struggle");
	const result = scenes.find((s) => s.sceneType === "result");
	const picked: Scene[] = [];
	if (struggle) picked.push(struggle);
	if (result) picked.push(result);
	// Fallback if either missing: fill from order
	if (picked.length < 2) {
		for (const s of scenes) {
			if (!picked.includes(s)) picked.push(s);
			if (picked.length >= 2) break;
		}
	}
	return picked;
}

type Route = typeof generateImagesRoute | typeof regenerateImagesRoute;

function makeHandler(label: string): RouteHandler<Route, AppEnv> {
	return async (c) => {
		const body = c.req.valid("json");
		const startedAt = Date.now();
		const requestedCount = body.count ?? DEFAULT_COUNT;
		const requestedSceneTypes = body.sceneTypes;

		let extract: SceneExtract;
		try {
			extract = await enhanceScenes({
				idea: body.idea,
				caption: body.caption,
				modifier: body.modifier,
			});
		} catch (error) {
			const code =
				error instanceof GeminiError && error.code === "timeout"
					? "timeout"
					: "prompt_enhancement_failed";
			logger.error({
				msg: `${label}: scene extraction failed`,
				code,
				error: error instanceof Error ? error.message : String(error),
			});
			return c.json(
				{
					error: code,
					message:
						code === "timeout"
							? "Prompt planning timed out. Try again."
							: "Couldn't plan the images. Try again.",
				},
				502,
			);
		}

		const scenesToRender = pickScenesToRender(
			extract.scenes,
			requestedCount,
			requestedSceneTypes,
		);

		if (scenesToRender.length === 0) {
			return c.json(
				{
					error: "generation_failed",
					message: "No scenes matched the request.",
				},
				502,
			);
		}

		/**
		 * Render a single scene with one retry on `rate_limited`.
		 * Replicate's throttled tier (< $5 credit) allows only burst=1 / 6 req per minute,
		 * which naturally rejects the parallel call. A single ~11s retry usually clears it.
		 */
		async function renderOne(scenePrompt: string): Promise<string | null> {
			let attempt = 0;
			while (attempt <= REPLICATE_MAX_RETRIES) {
				try {
					const urls = await generateImages(scenePrompt, {
						count: 1,
						aspectRatio: "1:1",
					});
					return urls[0] ?? null;
				} catch (err) {
					const code = err instanceof ReplicateError ? err.code : undefined;
					if (code === "rate_limited" && attempt < REPLICATE_MAX_RETRIES) {
						logger.warn({
							msg: `${label}: rate limited — retrying in ${REPLICATE_RETRY_DELAY_MS}ms`,
							attempt,
						});
						await new Promise((r) => setTimeout(r, REPLICATE_RETRY_DELAY_MS));
						attempt++;
						continue;
					}
					throw err;
				}
			}
			return null;
		}

		// Render scenes SEQUENTIALLY to respect Replicate's burst=1 limit on the
		// throttled tier (< $5 credit). Parallel calls otherwise 429 instantly.
		// Trade-off: 2-image gen ≈ 12–16s instead of 6–8s. Acceptable given the robustness.
		const userId = c.get("userId");
		const now = Date.now();
		const images: Array<{
			url: string;
			prompt: string;
			generatedAt: number;
			sceneType?: SceneType;
			label?: string;
			objectKey?: string;
		}> = [];
		const failures: ReplicateError[] = [];
		for (const scene of scenesToRender) {
			// Append the universal quality suffix right before sending to Replicate.
			// Stored on the image record too — so per-scene regenerate preserves it.
			const finalPrompt = withQualitySuffix(scene.prompt);
			try {
				const replicateUrl = await renderOne(finalPrompt);
				if (!replicateUrl) continue;
				// Mirror into S3 so the URL survives Replicate's CDN expiry. If the
				// mirror itself fails we fall back to the raw Replicate URL — ugly
				// but the generation isn't wasted.
				const mirrored = await mirrorReplicateImage(replicateUrl, userId);
				images.push({
					url: mirrored?.url ?? replicateUrl,
					prompt: finalPrompt,
					generatedAt: now,
					sceneType: scene.sceneType,
					label: scene.label,
					objectKey: mirrored?.objectKey,
				});
			} catch (err) {
				if (err instanceof ReplicateError) failures.push(err);
				logger.warn({
					msg: `${label}: scene render failed`,
					sceneType: scene.sceneType,
					error: err instanceof Error ? err.message : String(err),
				});
			}
		}

		// All scenes failed → surface the dominant error code with a tailored message
		if (images.length === 0) {
			const first = failures[0];
			const code =
				first?.code === "timeout"
					? "timeout"
					: first?.code === "insufficient_credit"
						? "insufficient_credit"
						: first?.code === "rate_limited"
							? "rate_limited"
							: "generation_failed";
			logger.error({
				msg: `${label}: all scenes failed`,
				code,
				failureCount: scenesToRender.length,
			});
			const message =
				code === "timeout"
					? "Image generation took too long. Try again."
					: code === "insufficient_credit"
						? "Image service is out of credit. Add credit at replicate.com/account/billing and retry."
						: code === "rate_limited"
							? "Replicate throttled the request. While your credit is under $5, only 1 image per ~10s is allowed. Wait a moment and retry, or top up to unlock parallel generation."
							: "Couldn't generate images. Try again.";
			return c.json({ error: code, message }, 502);
		}

		const response = {
			images,
			enhancedPrompt: scenesToRender
				.map((s) => `[${s.sceneType}|${s.label}] ${s.prompt}`)
				.join(" | "),
			who: extract.who,
			problem: extract.problem,
			context: extract.context,
		};

		const parsed = generateImagesResponseSchema.safeParse(response);
		if (!parsed.success) {
			logger.error({
				msg: `${label}: schema validation failed`,
				issues: parsed.error.issues,
			});
			return c.json(
				{
					error: "generation_failed",
					message: "Unexpected image response shape.",
				},
				502,
			);
		}

		logger.info({
			msg: `${label}: success`,
			count: images.length,
			requestedCount,
			who: extract.who ?? null,
			problem: extract.problem ?? null,
			sceneTypes: scenesToRender.map((s) => s.sceneType),
			labels: scenesToRender.map((s) => s.label),
			modifier: body.modifier ?? null,
			latencyMs: Date.now() - startedAt,
			userId: c.get("userId"),
			userEmail: c.get("user")?.email,
		});

		return c.json(parsed.data, 200);
	};
}

export const generateImagesHandler = makeHandler("images.generate");
export const regenerateImagesHandler = makeHandler("images.regenerate");
