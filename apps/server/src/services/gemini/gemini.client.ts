import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "@server/config";
import { logger } from "@server/lib/logger";

const client = new GoogleGenerativeAI(config.geminiApiKey);

const model = client.getGenerativeModel({
	model: "gemini-2.5-flash",
	generationConfig: {
		responseMimeType: "application/json",
		temperature: 0.9,
		maxOutputTokens: 2048,
		// @ts-expect-error — thinkingConfig is supported on 2.5 series but not
		// yet in @google/generative-ai types. Disables thinking budget so all
		// output tokens go to the actual JSON response.
		thinkingConfig: { thinkingBudget: 0 },
	},
});

export class GeminiError extends Error {
	public readonly originalError?: unknown;
	public readonly code?: "timeout" | "generation_failed";
	constructor(
		message: string,
		originalError?: unknown,
		code?: "timeout" | "generation_failed",
	) {
		super(message);
		this.name = "GeminiError";
		this.originalError = originalError;
		this.code = code;
	}
}

type GenerateOptions = {
	timeoutMs?: number;
	systemInstruction?: string;
};

export async function generateJson(
	prompt: string,
	options: GenerateOptions = {},
): Promise<unknown> {
	const { timeoutMs, systemInstruction } = options;
	const controller = new AbortController();
	const timer = timeoutMs
		? setTimeout(() => controller.abort(), timeoutMs)
		: null;

	try {
		const request = systemInstruction
			? {
					contents: [{ role: "user" as const, parts: [{ text: prompt }] }],
					systemInstruction: {
						role: "system" as const,
						parts: [{ text: systemInstruction }],
					},
				}
			: prompt;
		const result = await model.generateContent(request, {
			signal: controller.signal,
		});
		const text = result.response.text();
		try {
			return JSON.parse(text) as unknown;
		} catch (parseError) {
			logger.error({ msg: "gemini returned non-JSON response", text });
			throw new GeminiError(
				"Failed to parse model response as JSON",
				parseError,
				"generation_failed",
			);
		}
	} catch (error) {
		if (error instanceof GeminiError) throw error;
		if (controller.signal.aborted) {
			logger.error({ msg: "gemini request timed out", timeoutMs });
			throw new GeminiError(
				"Model took too long to respond",
				error,
				"timeout",
			);
		}
		logger.error({ msg: "gemini request failed", error: String(error) });
		throw new GeminiError("Gemini request failed", error, "generation_failed");
	} finally {
		if (timer) clearTimeout(timer);
	}
}
