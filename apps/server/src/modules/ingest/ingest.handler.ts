import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { RouteHandler } from "@hono/zod-openapi";
import { INGEST_LIMITS } from "@content-assist/shared";
import { logger } from "@server/lib/logger";
import type { AppEnv } from "@server/middleware/auth.middleware";
import { normaliseToContext } from "@server/services/context";
import { FfmpegError, extractAudio, probeAudioDuration } from "@server/services/ffmpeg";
import { VisionError, extractTextFromImage } from "@server/services/vision";
import { WhisperError, transcribeAudio } from "@server/services/whisper";
import type {
	ingestImageRoute,
	ingestVideoRoute,
} from "@server/modules/ingest/ingest.schema";

const INGEST_DIR = path.join(tmpdir(), "content-assist-ingest");
const MAX_RESPONSE_TEXT_LEN = 600;

async function ensureIngestDir(): Promise<void> {
	await mkdir(INGEST_DIR, { recursive: true });
}

function extFromMime(mime: string, fallback: string): string {
	if (mime.startsWith("video/")) {
		const sub = mime.slice(6);
		if (sub === "quicktime") return "mov";
		return sub || fallback;
	}
	if (mime === "image/jpeg") return "jpg";
	if (mime === "image/png") return "png";
	if (mime === "image/webp") return "webp";
	return fallback;
}

async function saveUploadToTmp(file: File, ext: string): Promise<string> {
	await ensureIngestDir();
	const filePath = path.join(INGEST_DIR, `${randomUUID()}.${ext}`);
	// File is a browser-standard web File; convert its stream to a Node read
	// stream and pipe to disk so we don't hold the whole blob in memory.
	const reader = file.stream();
	const nodeReadable = Readable.fromWeb(
		reader as unknown as import("node:stream/web").ReadableStream<Uint8Array>,
	);
	await pipeline(nodeReadable, createWriteStream(filePath));
	return filePath;
}

async function safeRm(filePath: string | null): Promise<void> {
	if (!filePath) return;
	try {
		await rm(filePath, { force: true });
	} catch {
		// swallow — the periodic tmp sweep catches anything we miss.
	}
}

function truncate(s: string, max: number): string {
	return s.length > max ? s.slice(0, max) : s;
}

/* --------------------------- VIDEO --------------------------- */

export const ingestVideoHandler: RouteHandler<typeof ingestVideoRoute, AppEnv> = async (c) => {
	const userId = c.get("userId");
	const startedAt = Date.now();

	const body = await c.req.parseBody();
	const file = body.file;
	if (!(file instanceof File)) {
		return c.json(
			{ error: "missing_file", message: "Attach a video file under the `file` field." },
			400,
		);
	}

	// Upfront mime + size checks (cheap — reject before disk write).
	if (!file.type.startsWith(INGEST_LIMITS.video.mimePrefix)) {
		return c.json(
			{
				error: "unsupported_type",
				message: `Unsupported video type: ${file.type || "unknown"}.`,
			},
			400,
		);
	}
	if (file.size > INGEST_LIMITS.video.maxBytes) {
		return c.json(
			{
				error: "too_large",
				message: `Video exceeds ${Math.round(INGEST_LIMITS.video.maxBytes / 1024 / 1024)} MB.`,
			},
			413,
		);
	}

	const ext = extFromMime(file.type, "mp4");
	let videoPath: string | null = null;
	let audioPath: string | null = null;
	try {
		videoPath = await saveUploadToTmp(file, ext);

		// Duration guard. ffprobe returns 0 on failure — be conservative and
		// treat that as "too long" rather than letting a malformed container
		// through to Whisper.
		const duration = await probeAudioDuration(videoPath);
		if (!duration || duration > INGEST_LIMITS.video.maxDurationSec) {
			return c.json(
				{
					error: "too_long",
					message: `Keep clips under ${INGEST_LIMITS.video.maxDurationSec} seconds.`,
				},
				400,
			);
		}

		audioPath = path.join(INGEST_DIR, `${randomUUID()}.mp3`);
		await extractAudio(videoPath, audioPath);
		const transcript = await transcribeAudio(audioPath);

		if (!transcript) {
			logger.info({ msg: "ingest.video: empty transcript", userId });
			return c.json(
				{
					context: "",
					type: "ABSTRACT" as const,
					transcript: "",
				},
				200,
			);
		}

		const { context, type } = await normaliseToContext(transcript, "video");

		logger.info({
			msg: "ingest.video: success",
			userId,
			sizeBytes: file.size,
			durationSec: Math.round(duration * 10) / 10,
			transcriptChars: transcript.length,
			contextChars: context.length,
			type,
			latencyMs: Date.now() - startedAt,
		});

		return c.json(
			{
				context: truncate(context, MAX_RESPONSE_TEXT_LEN),
				type,
				transcript: truncate(transcript, MAX_RESPONSE_TEXT_LEN),
			},
			200,
		);
	} catch (err) {
		logger.error({
			msg: "ingest.video: failed",
			userId,
			error: err instanceof Error ? err.message : String(err),
		});
		if (err instanceof WhisperError) {
			const status = err.code === "not_configured" ? 502 : 502;
			return c.json(
				{
					error: err.code,
					message:
						err.code === "not_configured"
							? "Voice transcription is not configured. Add OPENAI_API_KEY to the server."
							: "Couldn't transcribe the clip. Try again.",
				},
				status,
			);
		}
		if (err instanceof FfmpegError) {
			return c.json(
				{
					error: err.code,
					message:
						err.code === "not_installed"
							? "ffmpeg isn't installed on the server."
							: "Couldn't process the video. Try a shorter or different clip.",
				},
				502,
			);
		}
		return c.json(
			{ error: "ingest_failed", message: "Couldn't process the clip. Try again." },
			502,
		);
	} finally {
		await Promise.all([safeRm(videoPath), safeRm(audioPath)]);
	}
};

/* --------------------------- IMAGE --------------------------- */

export const ingestImageHandler: RouteHandler<typeof ingestImageRoute, AppEnv> = async (c) => {
	const userId = c.get("userId");
	const startedAt = Date.now();

	const body = await c.req.parseBody();
	const file = body.file;
	if (!(file instanceof File)) {
		return c.json(
			{ error: "missing_file", message: "Attach an image file under the `file` field." },
			400,
		);
	}

	const allowed: readonly string[] = INGEST_LIMITS.image.mime;
	if (!allowed.includes(file.type)) {
		return c.json(
			{
				error: "unsupported_type",
				message: "Only JPG, PNG, or WebP images are supported.",
			},
			400,
		);
	}
	if (file.size > INGEST_LIMITS.image.maxBytes) {
		return c.json(
			{
				error: "too_large",
				message: `Image exceeds ${Math.round(INGEST_LIMITS.image.maxBytes / 1024 / 1024)} MB.`,
			},
			413,
		);
	}

	const ext = extFromMime(file.type, "jpg");
	let imagePath: string | null = null;
	try {
		imagePath = await saveUploadToTmp(file, ext);
		const stats = await stat(imagePath);
		if (stats.size === 0) {
			return c.json(
				{ error: "empty_file", message: "The uploaded image is empty." },
				400,
			);
		}

		const ocrText = await extractTextFromImage(imagePath);
		if (!ocrText) {
			logger.info({ msg: "ingest.image: empty OCR", userId });
			return c.json(
				{ context: "", type: "ABSTRACT" as const, extractedText: "" },
				200,
			);
		}

		const { context, type } = await normaliseToContext(ocrText, "image");

		logger.info({
			msg: "ingest.image: success",
			userId,
			sizeBytes: file.size,
			ocrChars: ocrText.length,
			contextChars: context.length,
			type,
			latencyMs: Date.now() - startedAt,
		});

		return c.json(
			{
				context: truncate(context, MAX_RESPONSE_TEXT_LEN),
				type,
				extractedText: truncate(ocrText, MAX_RESPONSE_TEXT_LEN),
			},
			200,
		);
	} catch (err) {
		logger.error({
			msg: "ingest.image: failed",
			userId,
			error: err instanceof Error ? err.message : String(err),
		});
		if (err instanceof VisionError) {
			return c.json(
				{
					error: err.code,
					message:
						err.code === "not_configured"
							? "Image OCR is not configured. Add OPENAI_API_KEY to the server."
							: "Couldn't read the image. Try another.",
				},
				502,
			);
		}
		return c.json(
			{ error: "ingest_failed", message: "Couldn't process the image. Try again." },
			502,
		);
	} finally {
		await safeRm(imagePath);
	}
};
