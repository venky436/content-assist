import { createRoute } from "@hono/zod-openapi";
import {
	generateErrorSchema,
	generateScriptRequestSchema,
	generateScriptResponseSchema,
} from "@content-assist/shared";

const requestSchema = generateScriptRequestSchema.openapi("GenerateScriptRequest");
const responseSchema = generateScriptResponseSchema.openapi("GenerateScriptResponse");
const errorSchema = generateErrorSchema.openapi("GenerateScriptError");

export const scriptRoute = createRoute({
	method: "post",
	path: "/script",
	tags: ["generate"],
	summary: "Generate a spoken on-camera script (hook + lines + CTA) for an idea",
	request: {
		body: {
			content: { "application/json": { schema: requestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: responseSchema } },
			description: "Generated script",
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
