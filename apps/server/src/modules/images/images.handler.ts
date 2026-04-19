import type { RouteHandler } from "@hono/zod-openapi";
import {
	generateImagesResponseSchema,
	type SceneType,
} from "@content-assist/shared";
import { logger } from "@server/lib/logger";
import { GeminiError, generateJson } from "@server/services/gemini";
import { ReplicateError, generateImages } from "@server/services/replicate";
import {
	IMAGE_PROMPT_SYSTEM,
	buildImagePrompt,
} from "@server/modules/images/images.prompt";
import type {
	generateImagesRoute,
	regenerateImagesRoute,
} from "@server/modules/images/images.schema";

const GEMINI_TIMEOUT_MS = 10_000;
const MAX_SCENE_PROMPT_LEN = 500;
const MAX_LABEL_LEN = 40;
const DEFAULT_COUNT = 2;

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

function makeHandler(label: string): RouteHandler<Route> {
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

		let renderedUrls: string[];
		try {
			const results = await Promise.all(
				scenesToRender.map((scene) =>
					generateImages(scene.prompt, { count: 1, aspectRatio: "1:1" }),
				),
			);
			renderedUrls = results.map((urls) => urls[0] ?? "").filter(Boolean);
		} catch (error) {
			const replicateCode =
				error instanceof ReplicateError ? error.code : undefined;
			const code =
				replicateCode === "timeout"
					? "timeout"
					: replicateCode === "insufficient_credit"
						? "insufficient_credit"
						: "generation_failed";
			logger.error({
				msg: `${label}: replicate call failed`,
				code,
				error: error instanceof Error ? error.message : String(error),
			});
			const message =
				code === "timeout"
					? "Image generation took too long. Try again."
					: code === "insufficient_credit"
						? "Image service is out of credit. Add credit at replicate.com/account/billing and retry."
						: "Couldn't generate images. Try again.";
			return c.json({ error: code, message }, 502);
		}

		if (renderedUrls.length === 0) {
			return c.json(
				{
					error: "generation_failed",
					message: "No images came back from the model. Try again.",
				},
				502,
			);
		}

		const now = Date.now();
		const images = renderedUrls.map((url, i) => {
			const scene = scenesToRender[i];
			return {
				url,
				prompt: scene?.prompt ?? "",
				generatedAt: now,
				sceneType: scene?.sceneType,
				label: scene?.label,
			};
		});

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
		});

		return c.json(parsed.data, 200);
	};
}

export const generateImagesHandler = makeHandler("images.generate");
export const regenerateImagesHandler = makeHandler("images.regenerate");
