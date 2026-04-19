import { OpenAPIHono } from "@hono/zod-openapi";
import { generateHandler } from "@server/modules/generate/generate.handler";
import { generateRoute } from "@server/modules/generate/generate.schema";
import { hooksHandler } from "@server/modules/generate/hooks.handler";
import { hooksRoute } from "@server/modules/generate/hooks.schema";

const generate = new OpenAPIHono();
generate.openapi(generateRoute, generateHandler);
generate.openapi(hooksRoute, hooksHandler);

export { generate };
