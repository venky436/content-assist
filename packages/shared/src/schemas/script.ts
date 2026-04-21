import { z } from "zod";
import { contentTypeSchema } from "./generate";

export const generateScriptRequestSchema = z.object({
	idea: z.string().min(3).max(500),
	contentType: contentTypeSchema,
	stronger: z.boolean().optional(),
	avoidHooks: z.array(z.string()).max(20).optional(),
});
export type GenerateScriptRequest = z.infer<typeof generateScriptRequestSchema>;

export const generateScriptResponseSchema = z.object({
	hook: z.string().min(1).max(120),
	lines: z.array(z.string().min(1).max(140)).min(3).max(5),
	cta: z.string().min(1).max(120),
	hashtags: z.array(z.string().min(1)).min(8).max(12),
});
export type GenerateScriptResponse = z.infer<typeof generateScriptResponseSchema>;
