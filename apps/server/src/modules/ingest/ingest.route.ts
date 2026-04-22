import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "@server/middleware/auth.middleware";
import {
	ingestImageHandler,
	ingestVideoHandler,
} from "@server/modules/ingest/ingest.handler";
import {
	ingestImageRoute,
	ingestVideoRoute,
} from "@server/modules/ingest/ingest.schema";
import { createLimiter } from "@server/services/rate-limit";

const ingest = new OpenAPIHono<AppEnv>();

/**
 * Per-user 5/min cap. Ingest is cheap relative to generation but still calls
 * Whisper/Vision per request — bounding it prevents abuse from a single
 * authed account.
 */
const ingestLimiter = createLimiter({
	keyFn: (c) => `ingest:${c.get("userId") ?? "anon"}`,
	limit: 5,
	windowMs: 60 * 1000,
	tag: "ingest",
});
ingest.use("/ingest/*", ingestLimiter);

ingest.openapi(ingestVideoRoute, ingestVideoHandler);
ingest.openapi(ingestImageRoute, ingestImageHandler);

export { ingest };
