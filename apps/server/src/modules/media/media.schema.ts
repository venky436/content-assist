import { createRoute, z } from "@hono/zod-openapi";
import {
	listMediaResponseSchema,
	mediaAssetSchema,
	mediaErrorSchema,
	mediaKindEnum,
	updateMediaRequestSchema,
} from "@content-assist/shared";

const listMediaResponse = listMediaResponseSchema.openapi("ListMediaResponse");
const mediaAsset = mediaAssetSchema.openapi("MediaAsset");
const updateMediaRequest = updateMediaRequestSchema.openapi("UpdateMediaRequest");
const mediaError = mediaErrorSchema.openapi("MediaError");

const listQuerySchema = z.object({
	kind: mediaKindEnum.optional(),
	cursor: z.string().datetime().optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const listMediaRoute = createRoute({
	method: "get",
	path: "/media",
	tags: ["media"],
	summary: "List the signed-in user's media library",
	request: { query: listQuerySchema },
	responses: {
		200: {
			content: { "application/json": { schema: listMediaResponse } },
			description: "Media page",
		},
		401: {
			content: { "application/json": { schema: mediaError } },
			description: "Unauthorized",
		},
	},
});

const idParam = z.object({ id: z.string().uuid() });

export const updateMediaRoute = createRoute({
	method: "patch",
	path: "/media/{id}",
	tags: ["media"],
	summary: "Rename or retag a media asset",
	request: {
		params: idParam,
		body: {
			content: { "application/json": { schema: updateMediaRequest } },
			required: true,
		},
	},
	responses: {
		200: {
			content: {
				"application/json": { schema: z.object({ asset: mediaAsset }) },
			},
			description: "Updated asset",
		},
		401: {
			content: { "application/json": { schema: mediaError } },
			description: "Unauthorized",
		},
		404: {
			content: { "application/json": { schema: mediaError } },
			description: "Not found (or not owned)",
		},
	},
});

export const deleteMediaRoute = createRoute({
	method: "delete",
	path: "/media/{id}",
	tags: ["media"],
	summary: "Delete a media asset + its underlying S3 object",
	request: { params: idParam },
	responses: {
		200: {
			content: {
				"application/json": { schema: z.object({ ok: z.literal(true) }) },
			},
			description: "Deleted",
		},
		401: {
			content: { "application/json": { schema: mediaError } },
			description: "Unauthorized",
		},
		404: {
			content: { "application/json": { schema: mediaError } },
			description: "Not found (or not owned)",
		},
	},
});
