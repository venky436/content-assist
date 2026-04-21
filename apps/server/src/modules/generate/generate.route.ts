import { OpenAPIHono } from "@hono/zod-openapi";
import { generateHandler } from "@server/modules/generate/generate.handler";
import { generateRoute } from "@server/modules/generate/generate.schema";
import { hooksHandler } from "@server/modules/generate/hooks.handler";
import { hooksRoute } from "@server/modules/generate/hooks.schema";
import { scriptHandler } from "@server/modules/generate/script.handler";
import { scriptRoute } from "@server/modules/generate/script.schema";

const generate = new OpenAPIHono();
generate.openapi(generateRoute, generateHandler);
generate.openapi(hooksRoute, hooksHandler);
generate.openapi(scriptRoute, scriptHandler);

export { generate };
