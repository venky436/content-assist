import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "@server/middleware/auth.middleware";
import {
	getProfileHandler,
	updateProfileHandler,
} from "@server/modules/profile/profile.handler";
import {
	getProfileRoute,
	updateProfileRoute,
} from "@server/modules/profile/profile.schema";

const profile = new OpenAPIHono<AppEnv>();

profile.openapi(getProfileRoute, getProfileHandler);
profile.openapi(updateProfileRoute, updateProfileHandler);

export { profile };
