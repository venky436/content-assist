import type { VideoEnergy } from "@content-assist/shared";

/**
 * Energy is the pacing/rhythm bucket for a video — drives voice delivery,
 * inter-segment breath sizes, per-scene image duration, and crossfade length.
 * Orthogonal to `tone` (which drives BGM genre).
 *
 * Three presets:
 *   calm     → reflective, long breaths, slow scene cuts. Good for
 *              introspective / emotional / "what this really means" content.
 *   balanced → the current locked default. Warm, human, unhurried but not
 *              slow. Motivational / general content lands here.
 *   exciting → animated delivery, tight breaths, quick scene cuts, minimal
 *              crossfade. Good for "5 wild things", hype-y / travel-reel /
 *              reaction content.
 *
 * IMPORTANT: `balanced` values are byte-identical to the previously locked
 * constants in video.compose.ts / video.handler.ts. Content that resolves to
 * `balanced` (the default) produces the same output as before this file
 * existed — no regressions for the motivational / emotional flow the user
 * already approved.
 */

export type EnergyProfile = {
	hookInstructions: string;
	ctaInstructions: string;
	/** Bias injected into the per-line body pace tree. Shifts the adaptive
	 *  decision for medium-length lines in particular — slow and exciting
	 *  still allow exceptional lines to break the bias when justified. */
	bodyPaceBias: "slow" | "neutral" | "quick";
	/** Shared baseline for every body line — prepended before the pace +
	 *  mood cues so the voice identity stays consistent across lines. */
	bodyBaselineInstructions: string;
	// Silence gap seconds (ffmpeg lavfi anullsrc durations).
	gapHookBody: number;
	gapBodyLine: number;
	gapBodyCta: number;
	// Per-scene image duration bounds (seconds).
	sceneMinSec: number;
	sceneMaxSec: number;
	// Crossfade duration between adjacent scenes (seconds). Shorter = snappier.
	xfadeSec: number;
};

export const ENERGY_PROFILES: Record<VideoEnergy, EnergyProfile> = {
	calm: {
		hookInstructions:
			"Speak softly and slowly, like you're sharing something deeply personal. Gentle, reflective, unhurried. Leave space in your voice. No announcer energy whatsoever.",
		ctaInstructions:
			"Speak with quiet warmth and sincerity, like a gentle invitation between friends. Noticeably slow. Let the final word settle. Intimate, not salesy.",
		bodyPaceBias: "slow",
		bodyBaselineInstructions:
			"Speak like you're sharing something reflective with someone you trust, in a quiet room. Natural warmth, unhurried. Do NOT sound like a narrator. Let each thought land before moving to the next.",
		gapHookBody: 0.45,
		gapBodyLine: 0.3,
		gapBodyCta: 0.5,
		sceneMinSec: 4.0,
		sceneMaxSec: 10.0,
		xfadeSec: 0.6,
	},
	balanced: {
		hookInstructions:
			"Speak with energy and curiosity, like you're about to share something genuinely surprising. Slight upward inflection on the last word. Natural conversational pace — not rushed, not announcer-y. Clear, unhurried enunciation.",
		ctaInstructions:
			"Speak with warmth and sincerity, like a personal invitation. Noticeably slower than the rest. Land the final word clearly. Confident but friendly, not salesy.",
		bodyPaceBias: "neutral",
		bodyBaselineInstructions:
			"Speak like you're telling a close friend a personal story at a quiet cafe. Natural warmth. Do NOT sound like a narrator or an audiobook.",
		gapHookBody: 0.3,
		gapBodyLine: 0.22,
		gapBodyCta: 0.35,
		sceneMinSec: 2.5,
		sceneMaxSec: 10.0,
		xfadeSec: 0.45,
	},
	exciting: {
		hookInstructions:
			"Speak with high energy and animated enthusiasm, like you're telling a friend something amazing that just happened. Lively, fast, alive — but still clear and confident. Crisp delivery. Lean into the excitement.",
		ctaInstructions:
			"Speak with punchy confidence, like you're landing a great story. Quick, warm, alive. Don't trail off — end strong and clear.",
		bodyPaceBias: "quick",
		bodyBaselineInstructions:
			"Speak with animated, lively energy like you're sharing something thrilling with a friend. Quick, warm, engaged. Crisp enunciation. Keep the momentum going — no lulls, no drag.",
		gapHookBody: 0.15,
		gapBodyLine: 0.12,
		gapBodyCta: 0.22,
		sceneMinSec: 1.5,
		sceneMaxSec: 4.0,
		xfadeSec: 0.22,
	},
};

export function profileFor(energy: VideoEnergy): EnergyProfile {
	return ENERGY_PROFILES[energy];
}

// ─── Detector ─────────────────────────────────────────────────────────────

const URGENCY_WORDS = [
	"now",
	"go",
	"insane",
	"crazy",
	"wild",
	"lit",
	"finally",
	"shocking",
	"unbelievable",
	"omg",
	"hype",
	"huge",
	"bro",
	"stop",
	"listen",
];
const REFLECTIVE_WORDS = [
	"peaceful",
	"quiet",
	"reflect",
	"slow",
	"simple",
	"gentle",
	"calm",
	"remember",
	"home",
	"learn",
	"truth",
	"matters",
	"hurt",
	"lost",
	"alone",
	"miss",
	"healing",
];

/**
 * Heuristic energy detector. Cheap, pure, explainable — no LLM round-trip.
 * Signals:
 *   +2  for every "!"
 *   +1  for each urgency keyword hit
 *   +1  if caption's avg words/sentence < 6 (punchy cadence)
 *   −2  for each reflective keyword hit
 *   −1  for each ellipsis ("…" or "...")
 *
 *   score ≥ 3  → exciting
 *   score ≤ −2 → calm
 *   else       → balanced
 *
 * Keeping the thresholds conservative so the default (balanced) preserves
 * the locked flow for the widest range of content.
 */
export function detectEnergy(input: {
	idea: string;
	caption: string;
	hook?: string;
}): VideoEnergy {
	const text = [input.idea, input.hook ?? "", input.caption]
		.join(" ")
		.toLowerCase();

	let score = 0;

	// Exclamation marks.
	const excl = (text.match(/!/g) ?? []).length;
	score += excl * 2;

	// Ellipses.
	const ellipses = (text.match(/…|\.\.\./g) ?? []).length;
	score -= ellipses;

	// Keyword hits — count EACH hit, not just distinct ones.
	for (const w of URGENCY_WORDS) {
		const re = new RegExp(`\\b${w}\\b`, "g");
		const hits = (text.match(re) ?? []).length;
		score += hits;
	}
	for (const w of REFLECTIVE_WORDS) {
		const re = new RegExp(`\\b${w}\\b`, "g");
		const hits = (text.match(re) ?? []).length;
		score -= hits * 2;
	}

	// Caption punchiness: short sentences on average → tilt toward exciting.
	const caption = input.caption.trim();
	if (caption.length > 0) {
		const sentences = caption
			.split(/[.!?]+/)
			.map((s) => s.trim())
			.filter(Boolean);
		if (sentences.length > 0) {
			const totalWords = sentences.reduce(
				(sum, s) => sum + s.split(/\s+/).filter(Boolean).length,
				0,
			);
			const avgWps = totalWords / sentences.length;
			if (avgWps < 6) score += 1;
		}
	}

	if (score >= 3) return "exciting";
	if (score <= -2) return "calm";
	return "balanced";
}
