import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { config } from "@server/config";
import { logger } from "@server/lib/logger";

/**
 * Thin wrapper over OpenAI Vision (gpt-4o-mini) used for OCR + image text
 * extraction. Mirrors the lazy-client pattern from services/tts + services/whisper.
 */

const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_TEXT_LEN = 2_000;

export type VisionErrorCode =
	| "not_configured"
	| "timeout"
	| "extraction_failed";

export class VisionError extends Error {
	public readonly code: VisionErrorCode;
	public readonly originalError?: unknown;
	constructor(message: string, code: VisionErrorCode, originalError?: unknown) {
		super(message);
		this.name = "VisionError";
		this.code = code;
		this.originalError = originalError;
	}
}

let client: OpenAI | null = null;
function getClient(): OpenAI {
	if (!config.openaiApiKey) {
		throw new VisionError(
			"OPENAI_API_KEY is not configured. Add it to apps/server/.env to enable image ingest.",
			"not_configured",
		);
	}
	if (!client) client = new OpenAI({ apiKey: config.openaiApiKey });
	return client;
}

export type VisionOptions = {
	timeoutMs?: number;
};

const MIME_BY_EXT: Record<string, string> = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
};

function guessMime(filePath: string): string {
	const ext = path.extname(filePath).toLowerCase();
	return MIME_BY_EXT[ext] ?? "image/jpeg";
}

/**
 * OCR an on-disk image. Returns the extracted text (may be empty if the
 * model couldn't read anything — caller handles that fallback).
 */
export async function extractTextFromImage(
	filePath: string,
	options: VisionOptions = {},
): Promise<string> {
	const { timeoutMs = 15_000 } = options;
	const startedAt = Date.now();
	const openai = getClient();
	const mime = guessMime(filePath);

	let dataUrl: string;
	try {
		const bytes = await readFile(filePath);
		dataUrl = `data:${mime};base64,${bytes.toString("base64")}`;
	} catch (err) {
		throw new VisionError(
			"Could not read image file for Vision OCR",
			"extraction_failed",
			err,
		);
	}

	try {
		const response = await openai.chat.completions.create(
			{
				model: DEFAULT_MODEL,
				messages: [
					{
						role: "user",
						content: [
							{
								type: "text",
								text: "Extract all readable text from this image. Preserve line breaks for handwritten notes. Return plain text only — no markdown, no commentary. If there's no readable text, return an empty response.",
							},
							{ type: "image_url", image_url: { url: dataUrl } },
						],
					},
				],
				// We don't need much — captions, notes, screenshots are short.
				max_tokens: 600,
			},
			{ timeout: timeoutMs },
		);
		const raw = response.choices[0]?.message?.content ?? "";
		const text = (typeof raw === "string" ? raw : "").trim().slice(0, MAX_TEXT_LEN);
		logger.info({
			msg: "vision: ocr success",
			chars: text.length,
			mime,
			latencyMs: Date.now() - startedAt,
		});
		return text;
	} catch (error) {
		logger.error({
			msg: "vision: ocr failed",
			error: error instanceof Error ? error.message : String(error),
		});
		const isTimeout =
			error instanceof Error && /timeout|aborted/i.test(error.message);
		throw new VisionError(
			"OpenAI Vision request failed",
			isTimeout ? "timeout" : "extraction_failed",
			error,
		);
	}
}
