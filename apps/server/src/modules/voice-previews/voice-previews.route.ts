import { OpenAPIHono } from "@hono/zod-openapi";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

/**
 * Serves the committed voice-preview MP3s (alloy/echo/fable/onyx/nova/shimmer)
 * from apps/server/src/assets/voice-previews/. Public (no auth) — tiny files,
 * no PII, used by the admin voice picker to let users audition voices before
 * generating a video.
 */
const voicePreviews = new OpenAPIHono();

const ALLOWED = new Set([
	"alloy",
	"echo",
	"fable",
	"onyx",
	"nova",
	"shimmer",
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// modules/voice-previews/ → ../../assets/voice-previews/
const PREVIEWS_DIR = path.resolve(
	__dirname,
	"..",
	"..",
	"assets",
	"voice-previews",
);

voicePreviews.get("/:filename", async (c) => {
	const filename = c.req.param("filename");
	if (!filename.endsWith(".mp3")) {
		return c.json({ error: "not_found", message: "Invalid preview filename." }, 404);
	}
	const voice = filename.slice(0, -".mp3".length);
	if (!ALLOWED.has(voice)) {
		return c.json({ error: "not_found", message: "Unknown voice." }, 404);
	}

	const filePath = path.join(PREVIEWS_DIR, filename);
	let size: number;
	try {
		const s = await stat(filePath);
		if (!s.isFile()) {
			return c.json({ error: "not_found", message: "Preview not available." }, 404);
		}
		size = s.size;
	} catch {
		return c.json({ error: "not_found", message: "Preview not available." }, 404);
	}

	const nodeStream = createReadStream(filePath);
	const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
	c.header("Content-Type", "audio/mpeg");
	c.header("Content-Length", String(size));
	// Long cache — previews never change.
	c.header("Cache-Control", "public, max-age=31536000, immutable");
	return c.body(webStream);
});

export { voicePreviews };
