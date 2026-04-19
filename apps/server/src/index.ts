import { serve } from "@hono/node-server";
import app from "@server/app";
import { config } from "@server/config";
import { logger } from "@server/lib/logger";

logger.info({ msg: "server starting", env: config.env, port: config.port });

serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
	logger.info({ msg: "server listening", url: `http://localhost:${port}` });
});

export default app;
