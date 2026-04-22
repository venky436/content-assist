import OpenAI from "openai";
import { config } from "@server/config";
import { logger } from "@server/lib/logger";

// Expressive 2025-era TTS. Accepts plain-English delivery instructions
// ("speak warmly like a friend telling a story") and has dramatically more
// natural prosody than the legacy tts-1. Same API + endpoint — swapping the
// model is a one-constant change.
const DEFAULT_MODEL = "gpt-4o-mini-tts";
const FALLBACK_MODEL = "tts-1";
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
	/** 0.25–4.0. Omitted = OpenAI default (1.0). Used for per-segment pacing. */
	speed?: number;
	/**
	 * Plain-English delivery direction passed to the model, e.g. *"Speak like
	 * you're telling a friend a story at a quiet cafe — natural breath, slight
	 * warmth, vary pace on important words."* Only honoured by expressive
	 * models (`gpt-4o-mini-tts`). Silently ignored by the `tts-1` fallback.
	 */
	instructions?: string;
};

/**
 * Synthesize speech from text using OpenAI TTS. Returns a Node `Buffer`
 * containing the raw audio bytes (MP3 by default). Caller writes it to disk.
 */
export async function synthesizeSpeech(
	text: string,
	options: GenerateOptions = {},
): Promise<Buffer> {
	const {
		voice = DEFAULT_VOICE,
		timeoutMs = 30_000,
		speed,
		instructions,
	} = options;
	const startedAt = Date.now();
	const openai = getClient();

	// Primary attempt: expressive model with instructions (if provided). On
	// failure (model not enabled for the account, transient outage, etc.) we
	// retry once on legacy `tts-1` so the video pipeline never dead-ends on
	// voice synthesis.
	//
	// `speed` is intentionally NOT passed to the expressive model:
	//   - It triggers post-hoc time-stretch which introduces warble/distortion
	//     and makes the delivery feel "fast-forwarded" rather than deliberate.
	//   - `gpt-4o-mini-tts` interprets pacing direction from `instructions`
	//     ("slow down on the important words", "land the final word clearly").
	// `speed` IS passed to the `tts-1` fallback — that model was trained with
	// the speed scalar and handles it cleanly.
	const callCreate = (model: string) => {
		const isExpressive = model === DEFAULT_MODEL;
		return openai.audio.speech.create(
			{
				model,
				voice,
				input: text,
				response_format: DEFAULT_FORMAT,
				...(isExpressive
					? instructions
						? // SDK types may lag behind the API — cast at this edge only.
							({ instructions } as { instructions: string })
						: {}
					: typeof speed === "number"
						? { speed }
						: {}),
			},
			{ timeout: timeoutMs },
		);
	};

	try {
		const response = await callCreate(DEFAULT_MODEL);
		const arrayBuffer = await response.arrayBuffer();
		logger.info({
			msg: "tts: success",
			model: DEFAULT_MODEL,
			chars: text.length,
			hasInstructions: Boolean(instructions),
			latencyMs: Date.now() - startedAt,
		});
		return Buffer.from(arrayBuffer);
	} catch (primaryError) {
		const isTimeout =
			primaryError instanceof Error &&
			/timeout|aborted/i.test(primaryError.message);
		logger.warn({
			msg: "tts: primary model failed, falling back to tts-1",
			model: DEFAULT_MODEL,
			fallbackModel: FALLBACK_MODEL,
			error:
				primaryError instanceof Error
					? primaryError.message
					: String(primaryError),
		});
		try {
			const response = await callCreate(FALLBACK_MODEL);
			const arrayBuffer = await response.arrayBuffer();
			logger.info({
				msg: "tts: fallback-to-tts1 success",
				chars: text.length,
				speed: speed ?? 1,
				latencyMs: Date.now() - startedAt,
			});
			return Buffer.from(arrayBuffer);
		} catch (fallbackError) {
			logger.error({
				msg: "tts: both primary and fallback failed",
				error:
					fallbackError instanceof Error
						? fallbackError.message
						: String(fallbackError),
			});
			throw new TTSError(
				"OpenAI TTS request failed",
				isTimeout ? "timeout" : "generation_failed",
				fallbackError,
			);
		}
	}
}
