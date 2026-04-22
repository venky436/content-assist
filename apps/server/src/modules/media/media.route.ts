import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "@server/middleware/auth.middleware";
import {
	deleteMediaHandler,
	listMediaHandler,
	updateMediaHandler,
} from "@server/modules/media/media.handler";
import {
	deleteMediaRoute,
	listMediaRoute,
	updateMediaRoute,
} from "@server/modules/media/media.schema";

const media = new OpenAPIHono<AppEnv>();

media.openapi(listMediaRoute, listMediaHandler);
media.openapi(updateMediaRoute, updateMediaHandler);
media.openapi(deleteMediaRoute, deleteMediaHandler);

export { media };
