import OpenAI from "openai";
import { config } from "@server/config";
import { logger } from "@server/lib/logger";

const DEFAULT_MODEL = "tts-1";
const DEFAULT_VOICE = "alloy";
const DEFAULT_FORMAT = "mp3";

export type TTSErrorCode = "not_configured" | "timeout" | "generation_failed";

export class TTSError extends Error {
	public readonly code: TTSErrorCode;
	public readonly originalError?: unknown;
	constructor(message: string, code: TTSErrorCode, originalError?: unknown) {
		super(message);
		this.name = "TTSError";
		this.code = code;
		this.originalError = originalError;
	}
}

let client: OpenAI | null = null;
function getClient(): OpenAI {
	if (!config.openaiApiKey) {
		throw new TTSError(
			"OPENAI_API_KEY is not configured. Add it to apps/server/.env to enable video voiceover.",
			"not_configured",
		);
	}
	if (!client) client = new OpenAI({ apiKey: config.openaiApiKey });
	return client;
}

type GenerateOptions = {
	voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
	timeoutMs?: number;
};

/**
 * Synthesize speech from text using OpenAI TTS. Returns a Node `Buffer`
 * containing the raw audio bytes (MP3 by default). Caller writes it to disk.
 */
export async function synthesizeSpeech(
	text: string,
	options: GenerateOptions = {},
): Promise<Buffer> {
	const { voice = DEFAULT_VOICE, timeoutMs = 30_000 } = options;
	const startedAt = Date.now();
	const openai = getClient();

	try {
		const response = await openai.audio.speech.create(
			{
				model: DEFAULT_MODEL,
				voice,
				input: text,
				response_format: DEFAULT_FORMAT,
			},
			{ timeout: timeoutMs },
		);
		const arrayBuffer = await response.arrayBuffer();
		logger.info({
			msg: "tts: success",
			chars: text.length,
			latencyMs: Date.now() - startedAt,
		});
		return Buffer.from(arrayBuffer);
	} catch (error) {
		logger.error({
			msg: "tts: request failed",
			error: error instanceof Error ? error.message : String(error),
		});
		const isTimeout =
			error instanceof Error && /timeout|aborted/i.test(error.message);
		throw new TTSError(
			"OpenAI TTS request failed",
			isTimeout ? "timeout" : "generation_failed",
			error,
		);
	}
}
