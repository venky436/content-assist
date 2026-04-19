import type { RouteHandler } from "@hono/zod-openapi";
import type { healthRoute } from "@server/modules/health/health.schema";

export const healthHandler: RouteHandler<typeof healthRoute> = (c) =>
	c.json(
		{
			status: "ok",
			uptime: Math.floor(process.uptime()),
			timestamp: new Date().toISOString(),
		},
		200,
	);
