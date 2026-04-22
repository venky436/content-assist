import { GeminiError, generateJson } from "@server/services/gemini";
import { logger } from "@server/lib/logger";

/**
 * Build a short TTS voiceover script from the creator's idea + caption.
 * Target: 40–80 words, 10–20 seconds at natural TTS pace (~4 words/sec).
 *
 * Heuristic: start with caption, and if it's too short to carry a reel,
 * prepend a framing line from the idea. Captions alone are often 10 words =
 * ~3s of speech, which truncates multi-scene videos.
 *
 * Retained for backward-compat + the response `voiceover` string (joined
 * segments). Natural-pacing pipeline uses `buildVoiceoverSegments` below.
 */
export function buildVoiceoverScript(input: {
	idea: string;
	caption: string;
	hook?: string;
}): string {
	const caption = input.caption.trim().replace(/\s+/g, " ");
	const idea = input.idea.trim().replace(/\s+/g, " ");
	const hook = input.hook?.trim().replace(/\s+/g, " ");

	// Approx 4 chars/word, 4 words/sec → aim for 240+ chars (~60 words, ~15s)
	// so voiceover-driven videos reliably clear the 12s floor.
	const TARGET_MIN_CHARS = 240;
	const TARGET_MAX_CHARS = 500;

	const pieces: string[] = [];
	if (hook) pieces.push(hook);
	pieces.push(caption);

	let voiceover = pieces.join(" ").trim();

	// Still too short? Prepend the idea itself as framing context.
	if (voiceover.length < TARGET_MIN_CHARS && idea) {
		voiceover = `${idea}. ${voiceover}`.trim();
	}

	// Cap to avoid runaway reels.
	return voiceover.slice(0, TARGET_MAX_CHARS);
}

export type VoiceoverSegments = {
	hook: string;
	/**
	 * 1–5 short lines the narrator says between the hook and the CTA. Rendered
	 * as separate TTS calls with a ~220ms breath between each. Splitting the
	 * body into lines is what makes the voice feel like someone thinking +
	 * breathing, not reciting.
	 */
	bodyLines: string[];
	cta: string;
};

const MIN_SEG_CHARS = 6;
const MAX_BODY_CHARS = 380;
const MAX_BODY_LINES = 5;
const FALLBACK_CTA = "Save this if it hit.";

/**
 * Content-word overlap ratio from A → B. Returns how much of A's content
 * is already present in B. Ignores stopword-ish short tokens (≤2 chars)
 * so a few repeated articles don't trip the dedupe.
 */
function coverageRatio(a: string, b: string): number {
	const toSet = (s: string) =>
		new Set(
			s
				.toLowerCase()
				.split(/[^a-z0-9]+/)
				.filter((w) => w.length > 2),
		);
	const A = toSet(a);
	const B = toSet(b);
	if (A.size === 0 || B.size === 0) return 0;
	let overlap = 0;
	for (const w of A) if (B.has(w)) overlap++;
	return overlap / A.size;
}

/**
 * Turn a raw idea into a narratable sentence: capitalize + end with a period.
 * Leaves already-terminated sentences alone.
 */
function naturalizeIdea(raw: string): string {
	const trimmed = raw.trim().replace(/\s+/g, " ");
	if (!trimmed) return "";
	const first = trimmed[0]!;
	const capped =
		first === first.toUpperCase() ? trimmed : first.toUpperCase() + trimmed.slice(1);
	return /[.!?…]$/.test(capped) ? capped : `${capped}.`;
}

/**
 * Truncate a string to `max` chars at a word boundary, leaving a trailing "…".
 */
function softTruncate(s: string, max: number): string {
	if (s.length <= max) return s;
	const cut = s.slice(0, max);
	const lastSpace = cut.lastIndexOf(" ");
	const base = lastSpace > Math.floor(max * 0.6) ? cut.slice(0, lastSpace) : cut;
	return `${base.trimEnd().replace(/[.,;:\s]+$/g, "")}…`;
}

/**
 * Split a body blob into 1–5 spoken lines. Legacy path — Gemini now returns
 * `bodyLines[]` directly, but we still call this for the heuristic fallback
 * and when Gemini hands us a string instead of an array.
 *
 * Rules:
 *  - Respect existing \n / sentence boundaries first.
 *  - If a single sentence is long (>14 words), split on commas to avoid one
 *    breathless line.
 *  - Trim whitespace, drop empties, cap to 5 lines.
 */
function splitIntoSpokenLines(body: string): string[] {
	const trimmed = body.trim();
	if (!trimmed) return [];

	// 1. Primary split: newlines OR sentence terminators followed by space.
	const primary = trimmed
		.split(/(?:\n+|(?<=[.!?…])\s+)/)
		.map((s) => s.trim())
		.filter(Boolean);

	// 2. For any line longer than ~14 words, split on commas to avoid a
	//    breathless delivery.
	const refined: string[] = [];
	for (const line of primary) {
		const wordCount = line.split(/\s+/).length;
		if (wordCount > 14 && /,/.test(line)) {
			const parts = line.split(/,\s*/).map((p) => p.trim()).filter(Boolean);
			refined.push(...parts);
		} else {
			refined.push(line);
		}
	}

	return refined.slice(0, MAX_BODY_LINES);
}

/**
 * Cap the total character count across bodyLines, dropping full lines from
 * the end first and only soft-truncating the last retained line if it's still
 * over budget. Keeps the array of complete thoughts rather than cutting a
 * line mid-breath.
 */
function capBodyLines(lines: string[], maxTotalChars: number): string[] {
	const kept: string[] = [];
	let runningTotal = 0;
	for (const line of lines) {
		if (runningTotal + line.length <= maxTotalChars) {
			kept.push(line);
			runningTotal += line.length;
			continue;
		}
		// The remaining budget fits only part of this line — soft-truncate it
		// if the room is enough to say something meaningful, otherwise drop it.
		const remaining = maxTotalChars - runningTotal;
		if (remaining >= 20) kept.push(softTruncate(line, remaining));
		break;
	}
	return kept.length > 0 ? kept : [softTruncate(lines[0] ?? "", maxTotalChars)];
}

/**
 * Split the voiceover into three natural parts:
 *   hook → opening scroll-stopper (emphasised, slightly slower)
 *   body → the user's idea + the caption's insight blended together
 *   cta  → closing ask (deliberate, BGM ducks under it)
 *
 * The middle ("body") is the key change: it narrates the user's ACTUAL idea
 * first, then the caption's payload. Creators write ideas as their raw intent
 * ("why beginners quit the gym in 2 weeks") — hearing it read back makes the
 * reel feel anchored to what they meant, not just to Gemini's caption.
 *
 * De-duplication guard: if the hook already covers ≥55% of the idea's content
 * words, the idea is dropped from the body (hook said it already).
 *
 * The server TTS pipeline renders each segment as a separate call at
 * different speeds, then stitches with silence gaps.
 */
export function buildVoiceoverSegments(input: {
	idea: string;
	caption: string;
	hook?: string;
}): VoiceoverSegments {
	const idea = input.idea.trim().replace(/\s+/g, " ");
	const caption = input.caption.trim();

	const rawHook = input.hook?.trim().replace(/\s+/g, " ");
	// Fallback hook: first sentence of caption, or idea if caption has none.
	const captionFirstSentence = caption.split(/[.!?]\s/)[0]?.trim();
	const hook =
		rawHook && rawHook.length >= MIN_SEG_CHARS
			? rawHook
			: captionFirstSentence && captionFirstSentence.length >= MIN_SEG_CHARS
				? captionFirstSentence
				: idea;

	// Split caption on newlines — creators often put the CTA on its own line.
	const captionLines = caption
		.split(/\n+/)
		.map((l) => l.trim())
		.filter(Boolean);

	let captionBody: string;
	let cta: string;
	if (captionLines.length >= 2) {
		captionBody = captionLines.slice(0, -1).join(" ").replace(/\s+/g, " ");
		cta = captionLines[captionLines.length - 1]!.replace(/\s+/g, " ");
	} else {
		captionBody = caption.replace(/\s+/g, " ");
		cta = FALLBACK_CTA;
	}

	// Blend: idea sentence + caption body, unless the hook already covers the
	// idea (prevents "Why did you quit at week 2? Why beginners quit the gym
	// in 2 weeks." — which is the same thing twice).
	const ideaSentence = naturalizeIdea(idea);
	const hookCoversIdea = coverageRatio(idea, hook) >= 0.55;
	const ideaPart = hookCoversIdea ? "" : ideaSentence;

	let body = [ideaPart, captionBody]
		.filter((p) => p && p.length >= MIN_SEG_CHARS)
		.join(" ")
		.trim();

	// Guards against degenerate shapes (anything too short to TTS cleanly).
	if (body.length < MIN_SEG_CHARS) body = captionBody || ideaSentence || idea;
	if (cta.length < MIN_SEG_CHARS) cta = FALLBACK_CTA;

	// Cap body length so the reel doesn't balloon past ~20s.
	body = softTruncate(body, MAX_BODY_CHARS);
	const bodyLines = splitIntoSpokenLines(body);

	return {
		hook,
		bodyLines: bodyLines.length > 0 ? bodyLines : [body],
		cta,
	};
}

// ─── Gemini-driven narration composer ─────────────────────────────────────────
//
// Preferred path for building the voiceover. Calls Gemini once with
// idea + hook + caption and returns a real spoken-script structured as
// { hook, body, cta }. Falls back to the heuristic above if Gemini fails.

const NARRATION_SYSTEM = [
	"You are a top-tier Instagram reel voiceover writer.",
	"Your job: take a creator's idea + recommended hook + caption, and write the",
	"EXACT words they will say on camera for a 12–18 second reel.",
	"",
	"Output: strict JSON with three parts — hook, bodyLines, cta — read in that",
	"order. `bodyLines` is an ARRAY of 3–5 short SPOKEN lines, not one blob.",
	"",
	"SPOKEN STYLE (CRITICAL)",
	"These are words someone SAYS OUT LOUD, not sentences they write. That means:",
	"- Short phrases. 4–10 words per line. Like how people actually talk.",
	"- One thought per line. Lines end where a human would take a natural breath.",
	"- Natural conversational rhythm — some lines start with \"And\", \"But\", \"The",
	"  thing is\" if it sounds right out loud.",
	"- Ellipses (\"…\") at the end of a line are ALLOWED when a natural pause fits.",
	"- It should read like someone thinking + talking, not an essay or paragraph.",
	"",
	"WRITTEN vs SPOKEN EXAMPLE (do not copy, just absorb the shift)",
	"BAD (written style):",
	"  body: \"From the moment we landed in Goa, everything felt bigger and",
	"         reconnecting with old friends reminded me what home really means.\"",
	"GOOD (spoken style):",
	"  bodyLines: [",
	"    \"The moment we landed…\",",
	"    \"everything just felt bigger.\",",
	"    \"And those old friends?\",",
	"    \"That's what home actually means.\"",
	"  ]",
	"",
	"HARD RULES",
	"- \"hook\" is the FIRST words spoken. Max 12 words. Scroll-stopping. Must carry",
	"  the idea's topic (e.g. gym / career / money / focus). Can be the provided",
	"  recommendedHook verbatim OR a sharper rewrite, but NEVER drop it.",
	"- \"bodyLines\" — 3 to 5 lines. Each 4–10 words. Each one a single spoken",
	"  thought. Together they should weave in the user's idea AND the caption's",
	"  insight. Total ≤45 words across all lines.",
	"- \"cta\" is one short line, ≤10 words, specific + benefit-driven.",
	"  Never \"tag a friend\" / \"double tap\" / \"like if you agree\".",
	"",
	"BANNED",
	"- Narrator-isms: \"In this video\", \"Today I want to talk about\", \"Let me",
	"  tell you\", \"Picture this\", \"Imagine\", \"Here's the thing\".",
	"- Filler: \"basically\", \"literally\", \"honestly\", \"kind of\", \"sort of\".",
	"- AI-speak: \"leveraging\", \"utilizing\", \"seamlessly\", \"optimizing\".",
	"- Generic adjectives: \"engaging\", \"better\", \"good\", \"nice\", \"solid\",",
	"  \"interesting\".",
	"",
	"Return ONLY valid JSON. No markdown fences. No prose outside the JSON.",
	"{ \"hook\": \"...\", \"bodyLines\": [\"...\", \"...\"], \"cta\": \"...\" }",
].join("\n");

function buildNarrationPrompt(input: {
	idea: string;
	caption: string;
	hook: string;
}): string {
	return [
		`Idea: "${input.idea.trim()}"`,
		`Recommended hook: "${input.hook.trim()}"`,
		"Caption:",
		input.caption.trim(),
		"",
		"Compose the reel voiceover as JSON { hook, bodyLines, cta }.",
		"hook starts, bodyLines expand the idea as 3–5 short spoken phrases",
		"(not a paragraph), cta closes.",
	].join("\n");
}

/**
 * Compose a narration script via Gemini. Returns `null` on any failure
 * (missing hook input, Gemini error, malformed JSON, segment too short) —
 * caller should then fall back to `buildVoiceoverSegments`.
 */
export async function composeNarrationViaGemini(input: {
	idea: string;
	caption: string;
	hook?: string;
}): Promise<VoiceoverSegments | null> {
	const providedHook = (input.hook ?? "").trim();
	if (providedHook.length < 4) return null; // need a real hook to anchor

	try {
		const raw = await generateJson(
			buildNarrationPrompt({
				idea: input.idea,
				caption: input.caption,
				hook: providedHook,
			}),
			{
				systemInstruction: NARRATION_SYSTEM,
				timeoutMs: 10_000,
			},
		);

		if (!raw || typeof raw !== "object") return null;
		const r = raw as Record<string, unknown>;
		const hook = typeof r.hook === "string" ? r.hook.trim() : "";
		const cta = typeof r.cta === "string" ? r.cta.trim() : "";

		// Gemini is asked for `bodyLines: string[]` but tolerate either shape:
		//   - array of strings → use directly
		//   - single `body` string (old shape) → split with heuristic
		let bodyLines: string[] = [];
		if (Array.isArray(r.bodyLines)) {
			bodyLines = r.bodyLines
				.map((l) => (typeof l === "string" ? l.trim() : ""))
				.filter((l) => l.length >= MIN_SEG_CHARS)
				.slice(0, MAX_BODY_LINES);
		} else if (typeof r.body === "string") {
			bodyLines = splitIntoSpokenLines(r.body);
		}

		const totalBodyChars = bodyLines.reduce((sum, l) => sum + l.length, 0);

		// Each segment must be TTS-able (not empty, not a single word).
		if (
			hook.length < 4 ||
			bodyLines.length === 0 ||
			totalBodyChars < 10 ||
			cta.length < 4
		) {
			return null;
		}

		// Hook-first guard: Gemini's hook must reuse ≥35% of the provided hook's
		// content words. Otherwise swap in the provided hook verbatim so the
		// user's scroll-stopper always leads.
		const finalHook =
			coverageRatio(providedHook, hook) >= 0.35 ? hook : providedHook;
		if (finalHook !== hook) {
			logger.warn({
				msg: "narration: gemini hook drifted; using provided hook",
				geminiHook: hook,
				providedHook,
			});
		}

		// Cap body length defensively across all lines so an over-eager narration
		// doesn't blow past the reel's 30s cap.
		const cappedBodyLines = capBodyLines(bodyLines, MAX_BODY_CHARS);

		return { hook: finalHook, bodyLines: cappedBodyLines, cta };
	} catch (err) {
		logger.warn({
			msg: "narration: gemini failed — falling back to heuristic",
			error: err instanceof Error ? err.message : String(err),
			geminiCode: err instanceof GeminiError ? err.code : undefined,
		});
		return null;
	}
}
