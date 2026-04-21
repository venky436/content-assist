import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { logger } from "@server/lib/logger";
import { corsMiddleware } from "@server/middleware/cors";
import { analyze } from "@server/modules/analyze";
import { generate } from "@server/modules/generate";
import { health } from "@server/modules/health";
import { images } from "@server/modules/images";
import { video, videosStatic } from "@server/modules/video";
import { startVideoCleanup } from "@server/services/video-storage";

const app = new OpenAPIHono({
	defaultHook: (result, c) => {
		if (!result.success) {
			return c.json(
				{
					error: "invalid_request",
					message: "Request payload failed validation.",
					issues: result.error.issues,
				},
				400,
			);
		}
	},
});

app.use("*", corsMiddleware);

app.use("*", async (c, next) => {
	const start = Date.now();
	await next();
	logger.info({
		msg: "request",
		method: c.req.method,
		path: c.req.path,
		status: c.res.status,
		durationMs: Date.now() - start,
	});
});

app.route("/health", health);
app.route("/generate", generate);
app.route("/analyze", analyze);
app.route("/images", images);
app.route("/video", video);
app.route("/videos", videosStatic);

// Kick off the 1-hour TTL cleanup sweep on the tmp video directory.
startVideoCleanup();

app.notFound((c) =>
	c.json({ error: "not_found", message: `No route for ${c.req.path}` }, 404),
);

app.onError((err, c) => {
	if (err instanceof HTTPException) {
		return err.getResponse();
	}
	if (err instanceof ZodError) {
		return c.json(
			{ error: "invalid_request", message: "Validation failed", issues: err.issues },
			400,
		);
	}
	logger.error({ msg: "unhandled error", error: err.message, stack: err.stack });
	return c.json(
		{ error: "internal_error", message: "Something went wrong." },
		500,
	);
});

export default app;
