const BANNED_ADJECTIVES = [
	"engaging",
	"better",
	"good",
	"nice",
	"solid",
	"interesting",
	"game changer",
	"game-changer",
	"level up",
	"unleash",
	"transform your life",
	"unlock your potential",
	"mind-blowing",
	"mind blowing",
	"shocking",
];

function collapseWhitespace(s: string): string {
	return s.replace(/\s+/g, " ").trim();
}

function stripQuotes(s: string): string {
	return s.replace(/^["'\-\s]+|["'\s]+$/g, "").trim();
}

function stripEmoji(s: string): string {
	// Strip common emoji / pictograph ranges. Keeps Latin punctuation intact.
	return s.replace(
		/[\u203C-\u3299\u{1F000}-\u{1FAFF}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
		"",
	);
}

function stripHashtags(s: string): string {
	return s.replace(/#[A-Za-z0-9_]+/g, "").replace(/\s+/g, " ").trim();
}

function stripStageDirections(s: string): string {
	return s.replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
}

function stripBannedAdjectives(raw: string): string {
	let out = raw;
	for (const phrase of BANNED_ADJECTIVES) {
		const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
		out = out.replace(re, "");
	}
	return collapseWhitespace(out);
}

function sanitizeLine(raw: unknown): string {
	if (typeof raw !== "string") return "";
	let s = stripQuotes(raw);
	s = stripStageDirections(s);
	s = stripHashtags(s);
	s = stripEmoji(s);
	s = stripBannedAdjectives(s);
	s = collapseWhitespace(s);
	return s;
}

import { cleanHashtags } from "@server/modules/generate/generate.clean";

export type CleanedScript = {
	hook: string;
	lines: string[];
	cta: string;
	hashtags: string[];
};

const MAX_HOOK_CHARS = 120;
const MAX_LINE_CHARS = 140;
const MAX_CTA_CHARS = 120;
const MIN_LINES = 3;
const MAX_LINES = 5;

function truncate(s: string, max: number): string {
	if (s.length <= max) return s;
	const cut = s.slice(0, max);
	const lastSpace = cut.lastIndexOf(" ");
	const base = lastSpace > Math.floor(max * 0.6) ? cut.slice(0, lastSpace) : cut;
	return `${base.trimEnd()}…`;
}

export function cleanScript(raw: unknown): CleanedScript | null {
	if (typeof raw !== "object" || raw === null) return null;
	const record = raw as Record<string, unknown>;

	const hookRaw = sanitizeLine(record.hook);
	const ctaRaw = sanitizeLine(record.cta);
	const linesInput = Array.isArray(record.lines) ? record.lines : [];

	if (!hookRaw || !ctaRaw) return null;

	const hook = truncate(hookRaw, MAX_HOOK_CHARS);
	const cta = truncate(ctaRaw, MAX_CTA_CHARS);

	const seen = new Set<string>();
	const lines: string[] = [];
	for (const entry of linesInput) {
		const cleaned = sanitizeLine(entry);
		if (!cleaned) continue;
		const capped = truncate(cleaned, MAX_LINE_CHARS);
		const key = capped.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		lines.push(capped);
		if (lines.length >= MAX_LINES) break;
	}

	if (lines.length < MIN_LINES) return null;

	const hashtags = cleanHashtags(record.hashtags);
	if (hashtags.length < 8) return null;

	return { hook, lines, cta, hashtags };
}
