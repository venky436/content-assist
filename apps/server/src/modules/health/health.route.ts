import { OpenAPIHono } from "@hono/zod-openapi";
import { healthHandler } from "@server/modules/health/health.handler";
import { healthRoute } from "@server/modules/health/health.schema";

const health = new OpenAPIHono();
health.openapi(healthRoute, healthHandler);

export { health };
