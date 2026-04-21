import type { RouteHandler } from "@hono/zod-openapi";
import {
	generateVideoResponseSchema,
	type VideoTone,
	type VideoVoice,
} from "@content-assist/shared";
import { logger } from "@server/lib/logger";
import { resolveBgmPath } from "@server/services/bgm";
import { FfmpegError } from "@server/services/ffmpeg";
import { TTSError, synthesizeSpeech } from "@server/services/tts";
import { reserveVideoPath } from "@server/services/video-storage";
import { composeVideo } from "@server/modules/video/video.compose";
import { buildVoiceoverScript } from "@server/modules/video/video.prompt";
import type { generateVideoRoute } from "@server/modules/video/video.schema";

function publicVideoUrl(origin: string, videoId: string): string {
	// Trim trailing slash, then append.
	const base = origin.replace(/\/$/, "");
	return `${base}/videos/${videoId}.mp4`;
}

function makeVideoId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const generateVideoHandler: RouteHandler<typeof generateVideoRoute> = async (c) => {
	const body = c.req.valid("json");
	const startedAt = Date.now();
	const videoId = makeVideoId();
	const tone: VideoTone = body.tone ?? "motivational";
	const wantsBgm = body.bgm !== false; // default true
	const voice: VideoVoice = body.voice ?? "female";
	// Map our 2-value gender enum to OpenAI TTS voice IDs.
	const openaiVoice: "nova" | "onyx" = voice === "male" ? "onyx" : "nova";

	// 1. Build voiceover text — either use what the client sent, or derive it.
	const voiceover =
		(body.voiceover && body.voiceover.trim().length > 0
			? body.voiceover.trim()
			: buildVoiceoverScript({
					idea: body.idea,
					caption: body.caption,
					hook: body.hook,
				})
		).slice(0, 800);

	// 2. TTS
	let voiceMp3: Buffer;
	try {
		voiceMp3 = await synthesizeSpeech(voiceover, { voice: openaiVoice });
	} catch (err) {
		const code =
			err instanceof TTSError && err.code === "not_configured"
				? "tts_not_configured"
				: err instanceof TTSError && err.code === "timeout"
					? "timeout"
					: "tts_failed";
		logger.error({
			msg: "video: tts failed",
			code,
			error: err instanceof Error ? err.message : String(err),
		});
		const message =
			code === "tts_not_configured"
				? "Voiceover is not configured. Add OPENAI_API_KEY to the server .env and restart."
				: code === "timeout"
					? "Voiceover took too long. Try again."
					: "Voiceover failed. Try again.";
		return c.json({ error: code, message }, 502);
	}

	// 3. Resolve BGM (optional — nulls out gracefully if MP3 missing)
	const bgmPath = wantsBgm ? resolveBgmPath(tone) : null;

	// 4. Compose via FFmpeg
	const outputPath = await reserveVideoPath(videoId);
	let result: Awaited<ReturnType<typeof composeVideo>>;
	try {
		result = await composeVideo({
			videoId,
			outputPath,
			scenes: body.images.map((i) => ({ url: i.url, sceneType: i.sceneType })),
			voiceMp3,
			bgmPath,
		});
	} catch (err) {
		const ffmpegCode = err instanceof FfmpegError ? err.code : undefined;
		const code =
			ffmpegCode === "not_installed"
				? "ffmpeg_not_installed"
				: ffmpegCode === "timeout"
					? "timeout"
					: "composition_failed";
		logger.error({
			msg: "video: compose failed",
			code,
			error: err instanceof Error ? err.message : String(err),
			stderr: err instanceof FfmpegError ? err.stderr : undefined,
		});
		const message =
			code === "ffmpeg_not_installed"
				? "FFmpeg is not installed on the server. Install it (e.g. `brew install ffmpeg`) and restart."
				: code === "timeout"
					? "Video took too long to render. Try again."
					: "Couldn't compose the video. Try again.";
		return c.json({ error: code, message }, 502);
	}

	// 5. Build absolute URL using the request's origin (so phones on LAN work).
	const origin = new URL(c.req.url).origin;
	const videoUrl = publicVideoUrl(origin, videoId);

	const response = {
		videoUrl,
		voiceover,
		durationMs: result.durationMs,
		tone,
		bgmUsed: result.bgmUsed,
		voice,
	};

	const parsed = generateVideoResponseSchema.safeParse(response);
	if (!parsed.success) {
		logger.error({
			msg: "video: response schema mismatch",
			issues: parsed.error.issues,
		});
		return c.json(
			{ error: "composition_failed", message: "Unexpected response shape." },
			502,
		);
	}

	logger.info({
		msg: "video: success",
		videoId,
		imageCount: body.images.length,
		durationMs: result.durationMs,
		bgmUsed: result.bgmUsed,
		tone,
		voice,
		latencyMs: Date.now() - startedAt,
	});

	return c.json(parsed.data, 200);
};
