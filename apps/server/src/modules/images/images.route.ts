import { OpenAPIHono } from "@hono/zod-openapi";
import {
	generateImagesHandler,
	regenerateImagesHandler,
} from "@server/modules/images/images.handler";
import {
	generateImagesRoute,
	regenerateImagesRoute,
} from "@server/modules/images/images.schema";

const images = new OpenAPIHono();
images.openapi(generateImagesRoute, generateImagesHandler);
images.openapi(regenerateImagesRoute, regenerateImagesHandler);

export { images };
