import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "@server/middleware/auth.middleware";
import {
	generateImagesHandler,
	regenerateImagesHandler,
} from "@server/modules/images/images.handler";
import {
	generateImagesRoute,
	regenerateImagesRoute,
} from "@server/modules/images/images.schema";

const images = new OpenAPIHono<AppEnv>();
images.openapi(generateImagesRoute, generateImagesHandler);
images.openapi(regenerateImagesRoute, regenerateImagesHandler);

export { images };
