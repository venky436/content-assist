import { createReadStream } from "node:fs";
import OpenAI from "openai";
import { config } from "@server/config";
import { logger } from "@server/lib/logger";

/**
 * Thin wrapper over OpenAI Whisper. Mirrors the lazy-client + typed-error
 * pattern in `services/tts/openai-tts.client.ts` — same OPENAI_API_KEY, same
 * error-code vocabulary, just pointing at the transcriptions endpoint.
 */

const DEFAULT_MODEL = "whisper-1";

export type WhisperErrorCode =
	| "not_configured"
	| "timeout"
	| "transcription_failed";

export class WhisperError extends Error {
	public readonly code: WhisperErrorCode;
	public readonly originalError?: unknown;
	constructor(message: string, code: WhisperErrorCode, originalError?: unknown) {
		super(message);
		this.name = "WhisperError";
		this.code = code;
		this.originalError = originalError;
	}
}

let client: OpenAI | null = null;
function getClient(): OpenAI {
	if (!config.openaiApiKey) {
		throw new WhisperError(
			"OPENAI_API_KEY is not configured. Add it to apps/server/.env to enable video ingest.",
			"not_configured",
		);
	}
	if (!client) client = new OpenAI({ apiKey: config.openaiApiKey });
	return client;
}

export type TranscribeOptions = {
	timeoutMs?: number;
	/** Optional language hint (ISO-639-1, e.g. "en", "hi"). Improves accuracy for known languages. */
	language?: string;
};

/**
 * Transcribe an on-disk audio file via Whisper. Returns the transcript string
 * (possibly empty if the clip has no speech — caller decides how to handle
 * that fallback).
 */
export async function transcribeAudio(
	filePath: string,
	options: TranscribeOptions = {},
): Promise<string> {
	const { timeoutMs = 25_000, language } = options;
	const startedAt = Date.now();
	const openai = getClient();

	try {
		const result = await openai.audio.transcriptions.create(
			{
				file: createReadStream(filePath),
				model: DEFAULT_MODEL,
				...(language ? { language } : {}),
			},
			{ timeout: timeoutMs },
		);
		const text = (result.text ?? "").trim();
		logger.info({
			msg: "whisper: transcribe success",
			chars: text.length,
			latencyMs: Date.now() - startedAt,
		});
		return text;
	} catch (error) {
		logger.error({
			msg: "whisper: transcribe failed",
			error: error instanceof Error ? error.message : String(error),
		});
		const isTimeout =
			error instanceof Error && /timeout|aborted/i.test(error.message);
		throw new WhisperError(
			"OpenAI Whisper request failed",
			isTimeout ? "timeout" : "transcription_failed",
			error,
		);
	}
}
