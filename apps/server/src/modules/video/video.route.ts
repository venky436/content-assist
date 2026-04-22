import { OpenAPIHono } from "@hono/zod-openapi";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { logger } from "@server/lib/logger";
import type { AppEnv } from "@server/middleware/auth.middleware";
import { getVideoPath } from "@server/services/video-storage";
import { generateVideoHandler } from "@server/modules/video/video.handler";
import { generateVideoRoute } from "@server/modules/video/video.schema";

const video = new OpenAPIHono<AppEnv>();

video.openapi(generateVideoRoute, generateVideoHandler);

export { video };

// Static video server. Exposed as a sibling route under its own prefix so the
// URL /videos/:id.mp4 returns the composed MP4. Lives under "videosStatic"
// to be mounted at /videos on the root app.
const videosStatic = new OpenAPIHono();

/**
 * Serve the composed MP4.
 *
 * Implements HTTP Range support — iOS AVPlayer (used by expo-video) refuses to
 * play videos from servers that don't advertise `Accept-Ranges: bytes` + return
 * 206 Partial Content to `Range:` requests. Without this, the phone downloads
 * the file but never starts playback.
 */
videosStatic.get("/:filename", async (c) => {
	const filename = c.req.param("filename");
	if (!filename.endsWith(".mp4")) {
		return c.json({ error: "not_found", message: "Invalid video filename." }, 404);
	}
	const id = filename.slice(0, -".mp4".length);
	const filePath = getVideoPath(id);

	let fileSize: number;
	try {
		const s = await stat(filePath);
		if (!s.isFile()) {
			return c.json({ error: "not_found", message: "Video not available." }, 404);
		}
		fileSize = s.size;
	} catch (err) {
		logger.warn({
			msg: "videos: stat failed",
			id,
			error: err instanceof Error ? err.message : String(err),
		});
		return c.json(
			{ error: "not_found", message: "Video expired or not found." },
			404,
		);
	}

	const rangeHeader = c.req.header("range");

	// No Range → return the whole file but still advertise range support
	// so subsequent requests from the same player use byte ranges.
	if (!rangeHeader) {
		const nodeStream = createReadStream(filePath);
		const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
		c.header("Content-Type", "video/mp4");
		c.header("Content-Length", String(fileSize));
		c.header("Accept-Ranges", "bytes");
		c.header("Cache-Control", "public, max-age=0, must-revalidate");
		return c.body(webStream);
	}

	// Parse "bytes=start-end"
	const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
	if (!match) {
		c.header("Content-Range", `bytes */${fileSize}`);
		return c.body(null, 416);
	}
	const startStr = match[1] ?? "";
	const endStr = match[2] ?? "";
	let start = startStr === "" ? 0 : Number.parseInt(startStr, 10);
	let end = endStr === "" ? fileSize - 1 : Number.parseInt(endStr, 10);

	// Clamp to file bounds
	if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
		c.header("Content-Range", `bytes */${fileSize}`);
		return c.body(null, 416);
	}
	if (end >= fileSize) end = fileSize - 1;
	const chunkSize = end - start + 1;

	const nodeStream = createReadStream(filePath, { start, end });
	const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
	c.header("Content-Type", "video/mp4");
	c.header("Content-Length", String(chunkSize));
	c.header("Content-Range", `bytes ${start}-${end}/${fileSize}`);
	c.header("Accept-Ranges", "bytes");
	c.header("Cache-Control", "public, max-age=0, must-revalidate");
	return c.body(webStream, 206);
});

export { videosStatic };
