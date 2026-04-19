import type { RouteHandler } from "@hono/zod-openapi";
import { generateResponseSchema } from "@content-assist/shared";
import { logger } from "@server/lib/logger";
import { GeminiError, generateJson } from "@server/services/gemini";
import {
	buildReasonMap,
	cleanCaption,
	cleanHashtags,
	cleanHooks,
	pickRecommendedHook,
	reasonFor,
} from "@server/modules/generate/generate.clean";
import { normalizeIdea } from "@server/modules/generate/generate.normalize";
import { buildGeneratePrompt } from "@server/modules/generate/generate.prompt";
import type { generateRoute } from "@server/modules/generate/generate.schema";

export const generateHandler: RouteHandler<typeof generateRoute> = async (
	c,
) => {
	const body = c.req.valid("json");
	const normalizedIdea = normalizeIdea(body.idea);
	const prompt = buildGeneratePrompt({
		idea: normalizedIdea,
		contentType: body.contentType,
	});
	const startedAt = Date.now();

	let raw: unknown;
	try {
		raw = await generateJson(prompt);
	} catch (error) {
		logger.error({
			msg: "generate: gemini call failed",
			error: error instanceof Error ? error.message : String(error),
		});
		return c.json(
			{
				error: "generation_failed",
				message:
					error instanceof GeminiError
						? error.message
						: "The model could not be reached. Please try again.",
			},
			502,
		);
	}

	if (typeof raw !== "object" || raw === null) {
		logger.error({ msg: "generate: non-object from model", raw });
		return c.json(
			{
				error: "generation_failed",
				message: "The model returned an unexpected response.",
			},
			502,
		);
	}

	const record = raw as Record<string, unknown>;
	const hooks = cleanHooks(record.hooks);
	const recommendedHook = pickRecommendedHook(hooks);
	const reasonMap = buildReasonMap(record.hooks, record.reasons);
	const cleaned = {
		hooks,
		recommendedHook,
		recommendedReason: reasonFor(recommendedHook, reasonMap),
		caption: cleanCaption(record.caption),
		hashtags: cleanHashtags(record.hashtags),
	};

	const parsed = generateResponseSchema.safeParse(cleaned);
	if (!parsed.success) {
		logger.error({
			msg: "generate: cleaned output failed validation",
			issues: parsed.error.issues,
			cleaned,
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
		msg: "generate: success",
		contentType: body.contentType,
		latencyMs: Date.now() - startedAt,
		normalizedIdea,
	});

	return c.json(parsed.data, 200);
};
