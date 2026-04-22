import { createRoute } from "@hono/zod-openapi";
import {
	confirmUploadRequestSchema,
	confirmUploadResponseSchema,
	presignRequestSchema,
	presignResponseSchema,
	uploadErrorSchema,
} from "@content-assist/shared";

const presignRequest = presignRequestSchema.openapi("PresignUploadRequest");
const presignResponse = presignResponseSchema.openapi("PresignUploadResponse");
const confirmRequest = confirmUploadRequestSchema.openapi("ConfirmUploadRequest");
const confirmResponse = confirmUploadResponseSchema.openapi("ConfirmUploadResponse");
const uploadError = uploadErrorSchema.openapi("UploadError");

export const presignUploadRoute = createRoute({
	method: "post",
	path: "/uploads/presign",
	tags: ["uploads"],
	summary: "Request a presigned S3 PUT URL for a file upload",
	request: {
		body: {
			content: { "application/json": { schema: presignRequest } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: presignResponse } },
			description: "Presigned URL + object key",
		},
		400: {
			content: { "application/json": { schema: uploadError } },
			description: "Unsupported mime or file too large",
		},
		401: {
			content: { "application/json": { schema: uploadError } },
			description: "Unauthorized",
		},
		429: {
			content: { "application/json": { schema: uploadError } },
			description: "Too many presign requests",
		},
	},
});

export const confirmUploadRoute = createRoute({
	method: "post",
	path: "/uploads/confirm",
	tags: ["uploads"],
	summary: "Confirm an upload — server verifies the object and records metadata",
	request: {
		body: {
			content: { "application/json": { schema: confirmRequest } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: confirmResponse } },
			description: "Upload confirmed",
		},
		400: {
			content: { "application/json": { schema: uploadError } },
			description: "Mismatch between claimed metadata and the uploaded object",
		},
		401: {
			content: { "application/json": { schema: uploadError } },
			description: "Unauthorized",
		},
		410: {
			content: { "application/json": { schema: uploadError } },
			description: "Object missing in storage (PUT didn't complete)",
		},
	},
});
