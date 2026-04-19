import { createRoute, z } from "@hono/zod-openapi";

const healthResponseSchema = z
	.object({
		status: z.string(),
		uptime: z.number().optional(),
		timestamp: z.string(),
	})
	.openapi("HealthResponse");

export const healthRoute = createRoute({
	method: "get",
	path: "/",
	tags: ["health"],
	summary: "Health check",
	responses: {
		200: {
			content: { "application/json": { schema: healthResponseSchema } },
			description: "Service is healthy",
		},
	},
});
