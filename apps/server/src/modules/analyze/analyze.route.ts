import { OpenAPIHono } from "@hono/zod-openapi";
import { analyzeHandler } from "@server/modules/analyze/analyze.handler";
import { analyzeRoute } from "@server/modules/analyze/analyze.schema";

const analyze = new OpenAPIHono();
analyze.openapi(analyzeRoute, analyzeHandler);

export { analyze };
