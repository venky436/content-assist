import { spawn } from "node:child_process";
import { logger } from "@server/lib/logger";

export type FfmpegErrorCode = "not_installed" | "timeout" | "failed";

export class FfmpegError extends Error {
	public readonly code: FfmpegErrorCode;
	public readonly stderr?: string;
	constructor(message: string, code: FfmpegErrorCode, stderr?: string) {
		super(message);
		this.name = "FfmpegError";
		this.code = code;
		this.stderr = stderr;
	}
}

/**
 * Run ffmpeg with the given argument list. Rejects on non-zero exit.
 * Captures stderr for diagnostic logging — FFmpeg always writes progress there.
 */
export function runFfmpeg(
	args: string[],
	options: { timeoutMs?: number } = {},
): Promise<void> {
	const timeoutMs = options.timeoutMs ?? 120_000;
	return new Promise((resolve, reject) => {
		const startedAt = Date.now();
		let child: ReturnType<typeof spawn>;
		try {
			child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
		} catch (err) {
			reject(
				new FfmpegError(
					"ffmpeg not found on PATH. Install it (e.g. `brew install ffmpeg`).",
					"not_installed",
				),
			);
			return;
		}

		let stderr = "";
		child.stderr?.on("data", (chunk) => {
			stderr += chunk.toString();
		});

		const timer = setTimeout(() => {
			child.kill("SIGKILL");
			reject(
				new FfmpegError(
					`ffmpeg exceeded ${timeoutMs}ms budget`,
					"timeout",
					stderr.slice(-500),
				),
			);
		}, timeoutMs);

		child.on("error", (err) => {
			clearTimeout(timer);
			const msg = err.message || String(err);
			const isMissing = /ENOENT/.test(msg);
			reject(
				new FfmpegError(
					isMissing
						? "ffmpeg not found on PATH. Install it (e.g. `brew install ffmpeg`)."
						: `ffmpeg failed to start: ${msg}`,
					isMissing ? "not_installed" : "failed",
					stderr.slice(-500),
				),
			);
		});

		child.on("close", (code) => {
			clearTimeout(timer);
			if (code === 0) {
				logger.info({
					msg: "ffmpeg: success",
					durationMs: Date.now() - startedAt,
				});
				resolve();
				return;
			}
			logger.error({
				msg: "ffmpeg: failed",
				exitCode: code,
				stderr: stderr.slice(-1000),
			});
			reject(
				new FfmpegError(
					`ffmpeg exited with code ${code}`,
					"failed",
					stderr.slice(-500),
				),
			);
		});
	});
}

/**
 * Extract audio from a video file into a standalone MP3 at `outPath`.
 * Used by the ingest pipeline to feed Whisper. 60s timeout is plenty for
 * the enforced 30s clip limit.
 */
export function extractAudio(
	inputPath: string,
	outPath: string,
	timeoutMs = 60_000,
): Promise<void> {
	return runFfmpeg(
		[
			"-y",
			"-i",
			inputPath,
			"-vn",
			"-acodec",
			"libmp3lame",
			"-q:a",
			"2",
			outPath,
		],
		{ timeoutMs },
	);
}

/**
 * Probe audio duration (seconds) via ffprobe. Returns 0 on failure — callers
 * should treat 0 as "unknown" and fall back to a sensible default.
 *
 * Works on both audio and video files since ffprobe reads the container's
 * `format.duration`, regardless of whether streams are audio-only.
 */
export function probeAudioDuration(filePath: string): Promise<number> {
	return new Promise((resolve) => {
		let child: ReturnType<typeof spawn>;
		try {
			child = spawn("ffprobe", [
				"-v",
				"error",
				"-show_entries",
				"format=duration",
				"-of",
				"default=noprint_wrappers=1:nokey=1",
				filePath,
			]);
		} catch {
			resolve(0);
			return;
		}
		let out = "";
		child.stdout?.on("data", (c) => {
			out += c.toString();
		});
		child.on("error", () => resolve(0));
		child.on("close", () => {
			const n = Number.parseFloat(out.trim());
			resolve(Number.isFinite(n) && n > 0 ? n : 0);
		});
	});
}
