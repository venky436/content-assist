import { z } from "zod";

export const contentTypeSchema = z.enum(["reel", "image", "story"]);
export type ContentType = z.infer<typeof contentTypeSchema>;

export const generateRequestSchema = z.object({
	idea: z
		.string()
		.trim()
		.min(15, "Describe your idea in at least a sentence (15+ chars) — '/hello' is not enough for Gemini to anchor to.")
		.max(500),
	contentType: contentTypeSchema,
});
export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export const generateResponseSchema = z.object({
	hooks: z.array(z.string().min(1)).min(4).max(5),
	recommendedHook: z.string().min(1),
	recommendedReason: z.string().min(1).max(80),
	caption: z.string().min(1).max(500),
	hashtags: z.array(z.string().min(1)).min(8).max(12),
});
export type GenerateResponse = z.infer<typeof generateResponseSchema>;

export const generateErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
});
export type GenerateError = z.infer<typeof generateErrorSchema>;

export const hooksOnlyRequestSchema = z.object({
	idea: z
		.string()
		.trim()
		.min(15, "Describe your idea in at least a sentence (15+ chars) — '/hello' is not enough for Gemini to anchor to.")
		.max(500),
	contentType: contentTypeSchema,
	stronger: z.boolean().optional().default(false),
	avoidHooks: z.array(z.string()).max(20).optional(),
});
export type HooksOnlyRequest = z.infer<typeof hooksOnlyRequestSchema>;

export const hooksOnlyResponseSchema = z.object({
	hooks: z.array(z.string().min(1)).min(4).max(5),
	recommendedHook: z.string().min(1),
	recommendedReason: z.string().min(1).max(80),
});
export type HooksOnlyResponse = z.infer<typeof hooksOnlyResponseSchema>;
