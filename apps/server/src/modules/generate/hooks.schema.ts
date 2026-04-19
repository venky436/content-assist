import { createRoute } from "@hono/zod-openapi";
import {
	generateErrorSchema,
	hooksOnlyRequestSchema,
	hooksOnlyResponseSchema,
} from "@content-assist/shared";

const requestSchema = hooksOnlyRequestSchema.openapi("HooksOnlyRequest");
const responseSchema = hooksOnlyResponseSchema.openapi("HooksOnlyResponse");
const errorSchema = generateErrorSchema.openapi("HooksOnlyError");

export const hooksRoute = createRoute({
	method: "post",
	path: "/hooks",
	tags: ["generate"],
	summary: "Regenerate only the 5 hooks for an existing idea",
	request: {
		body: {
			content: { "application/json": { schema: requestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: responseSchema } },
			description: "Regenerated hooks",
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
