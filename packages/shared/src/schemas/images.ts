import { z } from "zod";

// Internal scene identity — structural anchor for the story arc.
// Strict enum so we can guarantee "don't skip decision when 3 requested".
export const sceneTypeSchema = z.enum(["struggle", "decision", "result"]);
export type SceneType = z.infer<typeof sceneTypeSchema>;

// Human-facing emotional label Gemini picks for display.
// 2–4 words, niche-adapted (e.g. "Can't focus" / "Should I quit?" / "Back in control").
export const sceneLabelSchema = z.string().min(1).max(40);

export const generatedImageSchema = z.object({
	url: z.string().url(),
	prompt: z.string().min(1),
	generatedAt: z.number().int().positive(),
	sceneType: sceneTypeSchema.optional(),
	// `label` is what the UI shows on the image tile. `type` kept for backwards compat
	// with previously-saved posts (old value was a free string).
	label: sceneLabelSchema.optional(),
	type: z.string().min(1).max(40).optional(),
});
export type GeneratedImage = z.infer<typeof generatedImageSchema>;

export const generateImagesRequestSchema = z.object({
	idea: z.string().min(3).max(500),
	caption: z.string().max(500).optional(),
	modifier: z.string().max(80).optional(),
	count: z.number().int().min(2).max(3).optional(), // default 2
	sceneTypes: z.array(sceneTypeSchema).min(1).max(3).optional(), // for regenerate: keep same scenes
});
export type GenerateImagesRequest = z.infer<typeof generateImagesRequestSchema>;

export const generateImagesResponseSchema = z.object({
	images: z.array(generatedImageSchema).min(1).max(3),
	enhancedPrompt: z.string().min(1),
	who: z.string().optional(),
	problem: z.string().optional(),
	context: z.string().optional(),
});
export type GenerateImagesResponse = z.infer<typeof generateImagesResponseSchema>;

export const generateImagesErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
});
export type GenerateImagesError = z.infer<typeof generateImagesErrorSchema>;
