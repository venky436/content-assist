import { createRoute } from "@hono/zod-openapi";
import {
	profileErrorSchema,
	profileResponseSchema,
	updateProfileRequestSchema,
} from "@content-assist/shared";

const profileResponse = profileResponseSchema.openapi("ProfileResponse");
const updateProfileRequest = updateProfileRequestSchema.openapi(
	"UpdateProfileRequest",
);
const profileError = profileErrorSchema.openapi("ProfileError");

export const getProfileRoute = createRoute({
	method: "get",
	path: "/profile",
	tags: ["profile"],
	summary: "Get the current creator profile",
	responses: {
		200: {
			content: { "application/json": { schema: profileResponse } },
			description: "Profile (lazy-created on first access)",
		},
		401: {
			content: { "application/json": { schema: profileError } },
			description: "Unauthorized",
		},
	},
});

export const updateProfileRoute = createRoute({
	method: "patch",
	path: "/profile",
	tags: ["profile"],
	summary: "Update creator profile fields",
	request: {
		body: {
			content: { "application/json": { schema: updateProfileRequest } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: profileResponse } },
			description: "Updated profile",
		},
		400: {
			content: { "application/json": { schema: profileError } },
			description: "Validation or reserved-username error",
		},
		401: {
			content: { "application/json": { schema: profileError } },
			description: "Unauthorized",
		},
		409: {
			content: { "application/json": { schema: profileError } },
			description: "Username already taken",
		},
	},
});
