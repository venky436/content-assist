import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { logger } from "@server/lib/logger";
import {
	authMiddleware,
	type AppEnv,
} from "@server/middleware/auth.middleware";
import { corsMiddleware } from "@server/middleware/cors";
import { analyze } from "@server/modules/analyze";
import { auth } from "@server/modules/auth";
import { generate } from "@server/modules/generate";
import { health } from "@server/modules/health";
import { images } from "@server/modules/images";
import { ingest } from "@server/modules/ingest";
import { media } from "@server/modules/media";
import { profile } from "@server/modules/profile";
import { savedPosts } from "@server/modules/saved-posts";
import { uploads } from "@server/modules/uploads";
import { video, videosStatic } from "@server/modules/video";
import { voicePreviews } from "@server/modules/voice-previews";
import { createLimiter } from "@server/services/rate-limit";
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

// --- Public routes ---
app.route("/health", health);
app.route("/auth", auth);
app.route("/videos", videosStatic); // streamed MP4s — short TTL + opaque ids
app.route("/voice-previews", voicePreviews); // static MP3s for voice picker previews

// --- Protected AI routes ---
// Single sub-app so auth + per-user rate limit run once per request.
const protectedApi = new OpenAPIHono<AppEnv>();
protectedApi.use("*", authMiddleware);
protectedApi.use(
	"*",
	createLimiter({
		keyFn: (c) => {
			const userId = (c as unknown as { get(k: "userId"): string | undefined }).get("userId");
			return `ai:${userId ?? "anon"}`;
		},
		limit: 20,
		windowMs: 60 * 1000, // 1 min
		tag: "ai",
	}),
);
protectedApi.route("/generate", generate);
protectedApi.route("/analyze", analyze);
protectedApi.route("/images", images);
protectedApi.route("/video", video);
// Profile + media + uploads are gated by the same auth middleware but are
// zero-AI-cost, so the global `ai:20/min` limiter above applies only loosely.
// Uploads brings its own stricter 10/min bucket for /uploads/presign.
protectedApi.route("/", profile);
protectedApi.route("/", uploads);
protectedApi.route("/", media);
protectedApi.route("/", savedPosts);
protectedApi.route("/", ingest);
app.route("/", protectedApi);

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
