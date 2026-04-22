import { createRoute, z } from "@hono/zod-openapi";
import {
	listSavedPostsResponseSchema,
	savedPostErrorSchema,
	savedPostRequestSchema,
	savedPostResponseSchema,
	savedPostSourceSchema,
} from "@content-assist/shared";

const savedPostRequest = savedPostRequestSchema.openapi("SavedPostRequest");
const savedPostResponse = savedPostResponseSchema.openapi("SavedPostResponse");
const listResponse = listSavedPostsResponseSchema.openapi("ListSavedPostsResponse");
const savedPostError = savedPostErrorSchema.openapi("SavedPostError");

const listQuery = z.object({
	source: savedPostSourceSchema.optional(),
	cursor: z.string().datetime().optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
});

const idParam = z.object({ id: z.string().uuid() });

export const createSavedPostRoute = createRoute({
	method: "post",
	path: "/saved",
	tags: ["saved-posts"],
	summary: "Save a generated or analyzed post",
	request: {
		body: {
			content: { "application/json": { schema: savedPostRequest } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: savedPostResponse } },
			description: "Saved",
		},
		400: {
			content: { "application/json": { schema: savedPostError } },
			description: "Invalid payload",
		},
		401: {
			content: { "application/json": { schema: savedPostError } },
			description: "Unauthorized",
		},
	},
});

export const listSavedPostsRoute = createRoute({
	method: "get",
	path: "/saved",
	tags: ["saved-posts"],
	summary: "List the signed-in user's saved posts",
	request: { query: listQuery },
	responses: {
		200: {
			content: { "application/json": { schema: listResponse } },
			description: "Page of posts",
		},
		401: {
			content: { "application/json": { schema: savedPostError } },
			description: "Unauthorized",
		},
	},
});

export const getSavedPostRoute = createRoute({
	method: "get",
	path: "/saved/{id}",
	tags: ["saved-posts"],
	summary: "Get a single saved post",
	request: { params: idParam },
	responses: {
		200: {
			content: { "application/json": { schema: savedPostResponse } },
			description: "Post with fresh presigned URLs",
		},
		401: {
			content: { "application/json": { schema: savedPostError } },
			description: "Unauthorized",
		},
		404: {
			content: { "application/json": { schema: savedPostError } },
			description: "Not found (or not owned)",
		},
	},
});

export const deleteSavedPostRoute = createRoute({
	method: "delete",
	path: "/saved/{id}",
	tags: ["saved-posts"],
	summary: "Delete a saved post + its S3 objects (images + video)",
	request: { params: idParam },
	responses: {
		200: {
			content: {
				"application/json": { schema: z.object({ ok: z.literal(true) }) },
			},
			description: "Deleted",
		},
		401: {
			content: { "application/json": { schema: savedPostError } },
			description: "Unauthorized",
		},
		404: {
			content: { "application/json": { schema: savedPostError } },
			description: "Not found (or not owned)",
		},
	},
});
