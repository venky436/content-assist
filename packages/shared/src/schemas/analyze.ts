import { z } from "zod";

export const analyzeRequestSchema = z.object({
	content: z.string().min(10).max(2000),
});
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export const hookVerdictSchema = z.enum([
	"Weak",
	"Average",
	"Strong",
	"Very Strong",
]);
export type HookVerdict = z.infer<typeof hookVerdictSchema>;

export const priorityAreaSchema = z.enum(["hook", "caption"]);
export type PriorityArea = z.infer<typeof priorityAreaSchema>;

export const confidenceSchema = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof confidenceSchema>;

export const analyzeResponseSchema = z.object({
	score: z.number().int().min(0).max(100),
	verdict: hookVerdictSchema,
	explanation: z.string().min(1).max(250),
	originalHook: z.string().min(1).max(200),
	quickFix: z.string().min(1).max(140),
	problems: z.array(z.string().min(1)).min(2).max(3),
	captionIssues: z.array(z.string().min(1)).min(2).max(3),
	betterHook: z.string().min(1).max(80),
	hookReason: z.string().min(1).max(180),
	improvedCaption: z.string().min(1).max(500),
	captionReason: z.string().min(1).max(180),
	improvedPost: z.string().min(10).max(700),
	insight: z.string().min(1).max(320),
	priorityFix: priorityAreaSchema,
	confidence: confidenceSchema,
});
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;

export const analyzeErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
});
export type AnalyzeError = z.infer<typeof analyzeErrorSchema>;
