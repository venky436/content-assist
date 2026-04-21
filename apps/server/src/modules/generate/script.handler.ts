import type { RouteHandler } from "@hono/zod-openapi";
import { generateScriptResponseSchema } from "@content-assist/shared";
import { logger } from "@server/lib/logger";
import { GeminiError, generateJson } from "@server/services/gemini";
import { normalizeIdea } from "@server/modules/generate/generate.normalize";
import { buildScriptPrompt } from "@server/modules/generate/script.prompt";
import { cleanScript } from "@server/modules/generate/script.clean";
import type { scriptRoute } from "@server/modules/generate/script.schema";

export const scriptHandler: RouteHandler<typeof scriptRoute> = async (c) => {
	const body = c.req.valid("json");
	const normalizedIdea = normalizeIdea(body.idea);
	const prompt = buildScriptPrompt({
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
			msg: "script: gemini call failed",
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

	const cleaned = cleanScript(raw);
	if (!cleaned) {
		logger.error({
			msg: "script: cleaned output unusable",
			raw: typeof raw === "object" ? JSON.stringify(raw).slice(0, 500) : String(raw),
		});
		return c.json(
			{
				error: "generation_failed",
				message: "The script came back too short or malformed. Try again.",
			},
			502,
		);
	}

	const parsed = generateScriptResponseSchema.safeParse(cleaned);
	if (!parsed.success) {
		logger.error({
			msg: "script: output failed schema validation",
			issues: parsed.error.issues,
			cleaned,
		});
		return c.json(
			{
				error: "generation_failed",
				message: "The script didn't match the expected shape. Try again.",
			},
			502,
		);
	}

	logger.info({
		msg: "script: success",
		contentType: body.contentType,
		stronger: body.stronger ?? false,
		avoidCount: body.avoidHooks?.length ?? 0,
		lineCount: parsed.data.lines.length,
		latencyMs: Date.now() - startedAt,
	});

	return c.json(parsed.data, 200);
};
