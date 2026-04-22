import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "@server/middleware/auth.middleware";
import {
	confirmHandler,
	presignHandler,
} from "@server/modules/uploads/uploads.handler";
import {
	confirmUploadRoute,
	presignUploadRoute,
} from "@server/modules/uploads/uploads.schema";
import { createLimiter } from "@server/services/rate-limit";

const uploads = new OpenAPIHono<AppEnv>();

// Extra limiter on the presign endpoint: 10/min per user. Stops a cheap
// DoS that mints presigned URLs faster than the global ai:20/min cap.
const presignLimiter = createLimiter({
	keyFn: (c) => `uploads.presign:${c.get("userId") ?? "anon"}`,
	limit: 10,
	windowMs: 60 * 1000,
	tag: "uploads.presign",
});
uploads.use("/presign", presignLimiter);

uploads.openapi(presignUploadRoute, presignHandler);
uploads.openapi(confirmUploadRoute, confirmHandler);

export { uploads };
