import { createRoute, z } from "@hono/zod-openapi";
import {
	generateErrorSchema,
	generateRequestSchema,
	generateResponseSchema,
} from "@content-assist/shared";

const requestSchema = generateRequestSchema.openapi("GenerateRequest");
const responseSchema = generateResponseSchema.openapi("GenerateResponse");
const errorSchema = generateErrorSchema.openapi("GenerateError");

export const generateRoute = createRoute({
	method: "post",
	path: "/",
	tags: ["generate"],
	summary: "Generate hooks, caption, and hashtags for an Instagram idea",
	request: {
		body: {
			content: { "application/json": { schema: requestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: responseSchema } },
			description: "Generated content",
		},
		400: {
			content: { "application/json": { schema: errorSchema } },
			description: "Invalid request",
		},
		502: {
			content: { "application/json": { schema: errorSchema } },
			description: "Generation failed",
		},
	},
});

export type GenerateRouteType = typeof generateRoute;

export const _schemas = { requestSchema, responseSchema, errorSchema } as const;
export { z };
