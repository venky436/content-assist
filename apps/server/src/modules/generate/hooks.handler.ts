import type { RouteHandler } from "@hono/zod-openapi";
import { hooksOnlyResponseSchema } from "@content-assist/shared";
import { logger } from "@server/lib/logger";
import type { AppEnv } from "@server/middleware/auth.middleware";
import { GeminiError, generateJson } from "@server/services/gemini";
import {
	buildReasonMap,
	cleanHooks,
	pickRecommendedHook,
	reasonFor,
} from "@server/modules/generate/generate.clean";
import { normalizeIdea } from "@server/modules/generate/generate.normalize";
import { buildHooksOnlyPrompt } from "@server/modules/generate/generate.prompt";
import type { hooksRoute } from "@server/modules/generate/hooks.schema";

export const hooksHandler: RouteHandler<typeof hooksRoute, AppEnv> = async (c) => {
	const body = c.req.valid("json");
	const normalizedIdea = normalizeIdea(body.idea);
	const prompt = buildHooksOnlyPrompt({
		idea: normalizedIdea,
		contentType: body.contentType,
		stronger: body.stronger ?? false,
		avoidHooks: body.avoidHooks,
	});
	const startedAt = Date.now();

	let raw: unknown;
	try {
		raw = await generateJson(prompt);
	} catch (error) {
		logger.error({
			msg: "hooks: gemini call failed",
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
	};

	const parsed = hooksOnlyResponseSchema.safeParse(cleaned);
	if (!parsed.success) {
		logger.error({
			msg: "hooks: cleaned output failed validation",
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
		msg: "hooks: success",
		contentType: body.contentType,
		stronger: body.stronger ?? false,
		avoidCount: body.avoidHooks?.length ?? 0,
		latencyMs: Date.now() - startedAt,
		userId: c.get("userId"),
		userEmail: c.get("user")?.email,
	});

	return c.json(parsed.data, 200);
};
