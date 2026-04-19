import type { RouteHandler } from "@hono/zod-openapi";
import { analyzeResponseSchema, type AnalyzeResponse } from "@content-assist/shared";
import { logger } from "@server/lib/logger";
import { GeminiError, generateJson } from "@server/services/gemini";
import {
	cleanAnalysis,
	failureMessages,
	validateAnalysis,
} from "@server/modules/analyze/analyze.clean";
import {
	ANALYZE_SYSTEM_CONTEXT,
	buildAnalyzeCorrectorPrompt,
	buildAnalyzeTaskPrompt,
} from "@server/modules/analyze/analyze.prompt";
import type { analyzeRoute } from "@server/modules/analyze/analyze.schema";

const ANALYZE_TIMEOUT_MS = 10_000;
const CORRECTOR_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 2;
const URL_ONLY_REGEX = /^https?:\/\/\S+$/;

async function runGemini(
	prompt: string,
	timeoutMs: number,
): Promise<{ ok: true; raw: unknown } | { ok: false; code: string; message: string }> {
	try {
		const raw = await generateJson(prompt, {
			timeoutMs,
			systemInstruction: ANALYZE_SYSTEM_CONTEXT,
		});
		return { ok: true, raw };
	} catch (error) {
		const code =
			error instanceof GeminiError && error.code === "timeout"
				? "timeout"
				: "generation_failed";
		const message =
			code === "timeout"
				? "Analysis took too long. Try again."
				: error instanceof GeminiError
					? error.message
					: "The model could not be reached. Please try again.";
		logger.error({
			msg: "analyze: gemini call failed",
			code,
			error: error instanceof Error ? error.message : String(error),
		});
		return { ok: false, code, message };
	}
}

export const analyzeHandler: RouteHandler<typeof analyzeRoute> = async (c) => {
	const body = c.req.valid("json");
	const content = body.content.trim();

	if (URL_ONLY_REGEX.test(content)) {
		return c.json(
			{
				error: "url_only",
				message:
					"Paste the caption text — we can't fetch Instagram links yet.",
			},
			400,
		);
	}

	const startedAt = Date.now();
	const firstPrompt = buildAnalyzeTaskPrompt(content);
	const first = await runGemini(firstPrompt, ANALYZE_TIMEOUT_MS);
	if (!first.ok) {
		return c.json({ error: first.code, message: first.message }, 502);
	}

	let cleaned: AnalyzeResponse | null = cleanAnalysis(first.raw, content);
	let attempt = 0;

	while (
		cleaned &&
		validateAnalysis(cleaned, content).length > 0 &&
		attempt < MAX_RETRIES
	) {
		attempt++;
		const failures = validateAnalysis(cleaned, content);
		logger.info({
			msg: "analyze: triggering corrector retry",
			attempt,
			failures,
		});
		const correctorPrompt = buildAnalyzeCorrectorPrompt({
			content,
			previous: cleaned,
			failures: failureMessages(failures),
		});
		const retry = await runGemini(correctorPrompt, CORRECTOR_TIMEOUT_MS);
		if (!retry.ok) break;
		const retryCleaned = cleanAnalysis(retry.raw, content);
		if (!retryCleaned) break;
		const retryFailures = validateAnalysis(retryCleaned, content);
		if (retryFailures.length >= failures.length) {
			// no improvement — stop burning retries
			break;
		}
		cleaned = retryCleaned;
	}

	if (!cleaned) {
		logger.error({ msg: "analyze: cleaner rejected output" });
		return c.json(
			{
				error: "generation_failed",
				message: "The model output did not match the expected shape.",
			},
			502,
		);
	}

	const parsed = analyzeResponseSchema.safeParse(cleaned);
	if (!parsed.success) {
		logger.error({
			msg: "analyze: schema validation failed",
			issues: parsed.error.issues,
		});
		return c.json(
			{
				error: "generation_failed",
				message: "The model output did not match the expected shape.",
			},
			502,
		);
	}

	logger.info({
		msg: "analyze: success",
		score: parsed.data.score,
		verdict: parsed.data.verdict,
		priorityFix: parsed.data.priorityFix,
		confidence: parsed.data.confidence,
		attempt,
		latencyMs: Date.now() - startedAt,
	});

	return c.json(parsed.data, 200);
};
