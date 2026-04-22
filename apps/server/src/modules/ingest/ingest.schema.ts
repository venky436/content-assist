import { createRoute, z } from "@hono/zod-openapi";
import {
	ingestErrorSchema,
	ingestResponseSchema,
} from "@content-assist/shared";

const ingestResponse = ingestResponseSchema.openapi("IngestResponse");
const ingestError = ingestErrorSchema.openapi("IngestError");

/**
 * Multipart body shape — `file` is a `File` blob at runtime. zod-openapi's
 * body validator runs against the parsed body, so `z.string()` would reject
 * the actual File object. We use `z.any()` + passthrough so the validator
 * lets it through; the handler does the real size/mime/duration checks.
 * OpenAPI consumers still see `format: "binary"` in the generated spec.
 */
const multipartFileSchema = z
	.object({
		file: z.any().openapi({ type: "string", format: "binary" }),
	})
	.passthrough()
	.openapi("IngestMultipartBody");

const commonResponses = {
	200: {
		content: { "application/json": { schema: ingestResponse } },
		description: "Normalised context",
	},
	400: {
		content: { "application/json": { schema: ingestError } },
		description: "Invalid upload (size, mime, duration)",
	},
	401: {
		content: { "application/json": { schema: ingestError } },
		description: "Unauthorized",
	},
	413: {
		content: { "application/json": { schema: ingestError } },
		description: "Upload exceeded the size cap",
	},
	429: {
		content: { "application/json": { schema: ingestError } },
		description: "Rate limited",
	},
	502: {
		content: { "application/json": { schema: ingestError } },
		description: "Upstream (Whisper/Vision/Gemini) failed",
	},
} as const;

export const ingestVideoRoute = createRoute({
	method: "post",
	path: "/ingest/video",
	tags: ["ingest"],
	summary: "Upload a short clip and get a normalised content idea back",
	request: {
		body: {
			content: { "multipart/form-data": { schema: multipartFileSchema } },
			required: true,
		},
	},
	responses: commonResponses,
});

export const ingestImageRoute = createRoute({
	method: "post",
	path: "/ingest/image",
	tags: ["ingest"],
	summary: "Upload an image (notes / screenshot / document) and get a content idea",
	request: {
		body: {
			content: { "multipart/form-data": { schema: multipartFileSchema } },
			required: true,
		},
	},
	responses: commonResponses,
});
