import { z } from "zod";
import { logger } from "@server/lib/logger";
import { generateJson } from "@server/services/gemini";

/**
 * Turns a raw transcript (from Whisper) or OCR output (from Vision) into a
 * normalised `{ context, type }` payload that the existing Generate + Analyze
 * pipelines can consume as their `idea` / `content` field.
 *
 * Intentionally fault-tolerant: if Gemini times out or returns garbage, we
 * return the trimmed raw input with `type: "ABSTRACT"` so the downstream
 * pipeline never dead-ends. The user always sees + can edit the result.
 */

export const contextTypeValues = [
	"HUMAN",
	"LOCATION",
	"OBJECT",
	"ABSTRACT",
] as const;
export type ContextType = (typeof contextTypeValues)[number];

const TIMEOUT_MS = 10_000;
const MAX_CONTEXT_LEN = 300;

const CONTEXT_SYSTEM = [
	"You are a content planner that turns raw speech or written text into a tight content idea",
	"for an Instagram creator.",
	"Output STRICT JSON only — no prose, no markdown — with two keys:",
	'  "context": a 1–2 sentence content idea (emotion, situation, intent). Max 300 chars.',
	'  "type": one of HUMAN | LOCATION | OBJECT | ABSTRACT. HUMAN when the subject is a person,',
	"          LOCATION when it's a place, OBJECT when it's a thing, ABSTRACT for everything else.",
].join("\n");

const contextResponseSchema = z.object({
	context: z.string().min(1).max(MAX_CONTEXT_LEN),
	type: z.enum(contextTypeValues),
});

type SourceKind = "video" | "image";

function buildPrompt(rawText: string, kind: SourceKind): string {
	const label = kind === "video" ? "transcript" : "extracted text";
	return [
		`The following ${label} was captured from the creator's ${kind} input.`,
		"Convert it into a clear content idea AND classify the subject type.",
		"Fix grammar, strip filler words, focus on the meaning.",
		"",
		`${label.toUpperCase()}:`,
		`"""${rawText.trim().slice(0, 4_000)}"""`,
	].join("\n");
}

function fallback(rawText: string): { context: string; type: ContextType } {
	const clean = rawText.trim().replace(/\s+/g, " ").slice(0, MAX_CONTEXT_LEN);
	return { context: clean, type: "ABSTRACT" };
}

export async function normaliseToContext(
	rawText: string,
	kind: SourceKind,
): Promise<{ context: string; type: ContextType }> {
	const trimmed = rawText.trim();
	if (!trimmed) return { context: "", type: "ABSTRACT" };

	try {
		const raw = await generateJson(buildPrompt(trimmed, kind), {
			timeoutMs: TIMEOUT_MS,
			systemInstruction: CONTEXT_SYSTEM,
		});
		const parsed = contextResponseSchema.safeParse(raw);
		if (!parsed.success) {
			logger.warn({
				msg: "context: gemini response failed schema, using fallback",
				issues: parsed.error.issues,
			});
			return fallback(trimmed);
		}
		return parsed.data;
	} catch (err) {
		logger.warn({
			msg: "context: gemini call failed, using fallback",
			error: err instanceof Error ? err.message : String(err),
		});
		return fallback(trimmed);
	}
}
