import { createRoute } from "@hono/zod-openapi";
import {
	generateVideoErrorSchema,
	generateVideoRequestSchema,
	generateVideoResponseSchema,
} from "@content-assist/shared";

const requestSchema = generateVideoRequestSchema.openapi("GenerateVideoRequest");
const responseSchema = generateVideoResponseSchema.openapi("GenerateVideoResponse");
const errorSchema = generateVideoErrorSchema.openapi("GenerateVideoError");

export const generateVideoRoute = createRoute({
	method: "post",
	path: "/generate",
	tags: ["video"],
	summary:
		"Compose a short reel from images + TTS voiceover + optional background music",
	request: {
		body: {
			content: { "application/json": { schema: requestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: responseSchema } },
			description: "Composed video URL",
		},
		400: {
			content: { "application/json": { schema: errorSchema } },
			description: "Invalid request",
		},
		502: {
			content: { "application/json": { schema: errorSchema } },
			description: "Composition failed",
		},
	},
});
