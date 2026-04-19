import { createRoute } from "@hono/zod-openapi";
import {
	analyzeErrorSchema,
	analyzeRequestSchema,
	analyzeResponseSchema,
} from "@content-assist/shared";

const requestSchema = analyzeRequestSchema.openapi("AnalyzeRequest");
const responseSchema = analyzeResponseSchema.openapi("AnalyzeResponse");
const errorSchema = analyzeErrorSchema.openapi("AnalyzeError");

export const analyzeRoute = createRoute({
	method: "post",
	path: "/",
	tags: ["analyze"],
	summary: "Analyze a post: hook + caption critique with rewrites",
	request: {
		body: {
			content: { "application/json": { schema: requestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: responseSchema } },
			description: "Analysis result",
		},
		400: {
			content: { "application/json": { schema: errorSchema } },
			description: "Invalid request (URL-only or malformed)",
		},
		502: {
			content: { "application/json": { schema: errorSchema } },
			description: "Generation or timeout failure",
		},
	},
});
