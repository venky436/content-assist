import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "@server/middleware/auth.middleware";
import { analyzeHandler } from "@server/modules/analyze/analyze.handler";
import { analyzeRoute } from "@server/modules/analyze/analyze.schema";

const analyze = new OpenAPIHono<AppEnv>();
analyze.openapi(analyzeRoute, analyzeHandler);

export { analyze };
