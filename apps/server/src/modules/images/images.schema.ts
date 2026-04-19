import { createRoute } from "@hono/zod-openapi";
import {
	generateImagesErrorSchema,
	generateImagesRequestSchema,
	generateImagesResponseSchema,
} from "@content-assist/shared";

const requestSchema = generateImagesRequestSchema.openapi("GenerateImagesRequest");
const responseSchema = generateImagesResponseSchema.openapi("GenerateImagesResponse");
const errorSchema = generateImagesErrorSchema.openapi("GenerateImagesError");

export const generateImagesRoute = createRoute({
	method: "post",
	path: "/generate",
	tags: ["images"],
	summary: "Generate 2 images for a post idea via Replicate flux-dev",
	request: {
		body: {
			content: { "application/json": { schema: requestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: responseSchema } },
			description: "Two generated images",
		},
		400: {
			content: { "application/json": { schema: errorSchema } },
			description: "Invalid request",
		},
		502: {
			content: { "application/json": { schema: errorSchema } },
			description: "Generation failed or timeout",
		},
	},
});

export const regenerateImagesRoute = createRoute({
	method: "post",
	path: "/regenerate",
	tags: ["images"],
	summary: "Regenerate images for an existing idea with optional modifier",
	request: {
		body: {
			content: { "application/json": { schema: requestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: responseSchema } },
			description: "Two newly generated images",
		},
		400: {
			content: { "application/json": { schema: errorSchema } },
			description: "Invalid request",
		},
		502: {
			content: { "application/json": { schema: errorSchema } },
			description: "Generation failed or timeout",
		},
	},
});
