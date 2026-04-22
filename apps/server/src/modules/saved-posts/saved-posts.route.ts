import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "@server/middleware/auth.middleware";
import {
	createSavedPostHandler,
	deleteSavedPostHandler,
	getSavedPostHandler,
	listSavedPostsHandler,
} from "@server/modules/saved-posts/saved-posts.handler";
import {
	createSavedPostRoute,
	deleteSavedPostRoute,
	getSavedPostRoute,
	listSavedPostsRoute,
} from "@server/modules/saved-posts/saved-posts.schema";

const savedPosts = new OpenAPIHono<AppEnv>();

savedPosts.openapi(createSavedPostRoute, createSavedPostHandler);
savedPosts.openapi(listSavedPostsRoute, listSavedPostsHandler);
savedPosts.openapi(getSavedPostRoute, getSavedPostHandler);
savedPosts.openapi(deleteSavedPostRoute, deleteSavedPostHandler);

export { savedPosts };
