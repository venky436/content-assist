const BANNED_PHRASES = [
	"unlock your potential",
	"embrace the journey",
	"this changed everything",
	"changed my life",
	"changed my entire life",
	"game changer",
	"game-changer",
	"level up",
	"elevate your",
	"unleash",
	"transform your life",
	"your best self",
	"limitless",
	"the real reason",
	"here's the thing",
	"heres the thing",
	"let me tell you",
	"the truth is",
	"one secret",
	"the one secret",
	"the one thing",
	"this one thing",
	"this secret",
	"this tip",
	"this one trick",
	"one simple trick",
	"you won't believe",
	"you wont believe",
	"mind-blowing",
	"mind blowing",
	"shocking truth",
	"doctors hate",
	"nobody wants you to know",
];

const MAX_HOOK_WORDS = 9;
const TARGET_HOOKS = 5;
const MAX_CAPTION_CHARS = 200;

function wordCount(s: string): number {
	return s.split(/\s+/).filter(Boolean).length;
}

function words(s: string): string[] {
	return s.toLowerCase().split(/\s+/).filter(Boolean);
}

function containsBanned(s: string): boolean {
	const lower = s.toLowerCase();
	return BANNED_PHRASES.some((p) => lower.includes(p));
}

function similarity(a: string, b: string): number {
	const setA = new Set(words(a));
	const setB = new Set(words(b));
	if (setA.size === 0 || setB.size === 0) return 0;
	let overlap = 0;
	for (const w of setA) if (setB.has(w)) overlap++;
	return overlap / Math.max(setA.size, setB.size);
}

function sameFirstWord(a: string, b: string): boolean {
	const aw = words(a);
	const bw = words(b);
	if (aw.length === 0 || bw.length === 0) return false;
	return aw[0] === bw[0];
}

type Tier = "preferred" | "flat" | "banned";
type Candidate = { hook: string; tier: Tier };

function hasAnySignal(hook: string): boolean {
	const s = detectSignals(hook);
	return s.directAddress || s.tension || s.openLoop || s.curiosity || s.emotional;
}

function sanitizeHook(raw: unknown): Candidate | null {
	if (typeof raw !== "string") return null;
	const trimmed = raw.trim().replace(/^["'\-\s]+|["'\s]+$/g, "");
	if (!trimmed) return null;
	if (wordCount(trimmed) > MAX_HOOK_WORDS) return null;
	if (containsBanned(trimmed)) return { hook: trimmed, tier: "banned" };
	if (!hasAnySignal(trimmed)) return { hook: trimmed, tier: "flat" };
	return { hook: trimmed, tier: "preferred" };
}

export function cleanHooks(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	const seenExact = new Set<string>();
	const allCandidates: Candidate[] = [];
	for (const v of raw) {
		const s = sanitizeHook(v);
		if (!s) continue;
		const key = s.hook.toLowerCase();
		if (seenExact.has(key)) continue;
		seenExact.add(key);
		allCandidates.push(s);
	}
	if (allCandidates.length === 0) return [];

	const preferred = allCandidates.filter((c) => c.tier === "preferred").map((c) => c.hook);
	const flat = allCandidates.filter((c) => c.tier === "flat").map((c) => c.hook);
	const banned = allCandidates.filter((c) => c.tier === "banned").map((c) => c.hook);

	const fillFrom = (
		source: string[],
		existing: string[],
		simThreshold: number,
		enforceFirstWord: boolean,
	): string[] => {
		const out = [...existing];
		for (const c of source) {
			if (out.includes(c)) continue;
			if (enforceFirstWord && out.some((e) => sameFirstWord(e, c))) continue;
			if (out.some((e) => similarity(e, c) >= simThreshold)) continue;
			out.push(c);
			if (out.length >= TARGET_HOOKS) break;
		}
		return out;
	};

	// Tier A (preferred) — strict diversity
	let selected = fillFrom(preferred, [], 0.7, true);
	if (selected.length >= TARGET_HOOKS) return selected;
	selected = fillFrom(preferred, selected, 0.85, false);
	if (selected.length >= TARGET_HOOKS) return selected;
	selected = fillFrom(preferred, selected, 1.01, false);
	if (selected.length >= TARGET_HOOKS) return selected;

	// Tier B (flat) — acceptable fallback
	selected = fillFrom(flat, selected, 0.85, false);
	if (selected.length >= TARGET_HOOKS) return selected;
	selected = fillFrom(flat, selected, 1.01, false);
	if (selected.length >= TARGET_HOOKS) return selected;

	// Tier C (banned) — last resort
	selected = fillFrom(banned, selected, 0.85, false);
	if (selected.length >= TARGET_HOOKS) return selected;
	selected = fillFrom(banned, selected, 1.01, false);
	return selected;
}

export function cleanCaption(raw: unknown): string {
	if (typeof raw !== "string") return "";
	const collapsed = raw.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n");
	const lines = collapsed
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0)
		.slice(0, 2);
	let joined = lines.join("\n").trim();
	if (joined.length > MAX_CAPTION_CHARS) {
		const cut = joined.slice(0, MAX_CAPTION_CHARS);
		const lastSpace = cut.lastIndexOf(" ");
		joined = (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trimEnd();
		if (!/[.!?…]$/.test(joined)) joined = `${joined}…`;
	}
	return joined;
}

export function cleanHashtags(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	const seen = new Set<string>();
	const cleaned: string[] = [];
	for (const value of raw) {
		if (typeof value !== "string") continue;
		const normalized = normalizeHashtag(value);
		if (!normalized) continue;
		const key = normalized.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		cleaned.push(normalized);
		if (cleaned.length >= 10) break;
	}
	return cleaned;
}

function normalizeHashtag(raw: string): string {
	const trimmed = raw.trim().replace(/\s+/g, "");
	if (!trimmed) return "";
	const body = trimmed.replace(/^#+/, "");
	if (!body) return "";
	return `#${body}`;
}

const DIRECT_ADDRESS = /\b(you|your|you're|youre|yours)\b/i;
const TENSION_WORDS = [
	"wrong",
	"fail",
	"fails",
	"failing",
	"problem",
	"mistake",
	"mistakes",
	"broken",
	"ruining",
	"ruins",
	"killing",
	"hurting",
];
const OPEN_LOOP_PATTERNS = [
	/\bwhy\b/i,
	/\bhere'?s\b/i,
	/\bthis is why\b/i,
	/\bthe reason\b/i,
	/\bdo this instead\b/i,
	/\bthe fix\b/i,
];
const EMOTIONAL_WORDS = ["quit", "quits", "impossible", "pain", "painful", "struggle", "struggling"];

type HookSignals = {
	directAddress: boolean;
	tension: boolean;
	openLoop: boolean;
	curiosity: boolean;
	emotional: boolean;
	short: boolean;
};

function detectSignals(hook: string): HookSignals {
	const lower = hook.toLowerCase();
	const wc = wordCount(hook);
	return {
		directAddress: DIRECT_ADDRESS.test(hook),
		tension: TENSION_WORDS.some((w) => lower.includes(w)),
		openLoop: OPEN_LOOP_PATTERNS.some((re) => re.test(hook)),
		curiosity: /\?$/.test(hook) || /[…\.]{3}$/.test(hook.trim()),
		emotional: EMOTIONAL_WORDS.some((w) => lower.includes(w)),
		short: wc <= 6,
	};
}

export function scoreHook(hook: string): number {
	const s = detectSignals(hook);
	let score = 0;
	if (s.directAddress) score += 2;
	if (s.tension) score += 2;
	if (s.openLoop) score += 2;
	if (s.curiosity) score += 1;
	if (s.emotional) score += 1;
	if (s.short) score += 1;
	return score;
}

export function pickRecommendedHook(hooks: string[]): string {
	if (hooks.length === 0) return "";
	const scored = hooks.map((hook) => ({
		hook,
		score: scoreHook(hook),
		wc: wordCount(hook),
	}));
	scored.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		return a.wc - b.wc;
	});
	return scored[0]?.hook ?? hooks[0] ?? "";
}

const MAX_REASON_CHARS = 80;
const MAX_REASON_WORDS = 8;

const AI_SPEAK_WORDS = [
	"leveraging",
	"leverages",
	"leverage",
	"utilizing",
	"utilize",
	"utilizes",
	"seamlessly",
	"seamless",
	"effectively",
	"fostering",
	"fosters",
	"optimizing",
	"optimizes",
	"synergy",
	"synergistic",
	"elevate",
	"elevates",
	"holistic",
	"holistically",
	"robust",
];

function normalizeHookKey(s: string): string {
	return s.trim().toLowerCase().replace(/^["'\-\s]+|["'\s]+$/g, "");
}

function trimReasonToWords(s: string, maxWords: number): string {
	const parts = s.split(/\s+/).filter(Boolean);
	if (parts.length <= maxWords) return s;
	return parts.slice(0, maxWords).join(" ");
}

function containsAiSpeak(s: string): boolean {
	const lower = s.toLowerCase();
	return AI_SPEAK_WORDS.some((w) => new RegExp(`\\b${w}\\b`, "i").test(lower));
}

export function buildReasonMap(
	rawHooks: unknown,
	rawReasons: unknown,
): Map<string, string> {
	const map = new Map<string, string>();
	if (!Array.isArray(rawHooks) || !Array.isArray(rawReasons)) return map;
	const n = Math.min(rawHooks.length, rawReasons.length);
	for (let i = 0; i < n; i++) {
		const h = rawHooks[i];
		const r = rawReasons[i];
		if (typeof h !== "string" || typeof r !== "string") continue;
		const trimmed = r.trim().replace(/\.$/, "");
		if (!trimmed) continue;
		map.set(normalizeHookKey(h), trimmed);
	}
	return map;
}

export function reasonFor(
	hook: string,
	geminiReasons: Map<string, string>,
): string {
	const key = normalizeHookKey(hook);
	const fromGemini = geminiReasons.get(key);
	if (fromGemini && fromGemini.length > 0 && !containsAiSpeak(fromGemini)) {
		const wordCapped = trimReasonToWords(fromGemini, MAX_REASON_WORDS);
		if (wordCapped.length <= MAX_REASON_CHARS) return wordCapped;
		return `${wordCapped.slice(0, MAX_REASON_CHARS - 1).trimEnd()}…`;
	}
	return explainHook(hook);
}

export function explainHook(hook: string): string {
	if (!hook) return "Balanced pick";
	const s = detectSignals(hook);
	const fragments: string[] = [];
	if (s.directAddress) fragments.push("direct challenge");
	if (s.tension) fragments.push("tension");
	if (s.openLoop) fragments.push("curiosity gap");
	if (s.curiosity && !s.openLoop) fragments.push("open question");
	if (s.emotional) fragments.push("emotional pull");

	if (fragments.length === 0) {
		if (s.short) return "Bold, punchy take";
		return "Bold contrarian take";
	}

	const picked = fragments.slice(0, 2);
	const sentence = picked
		.map((f, i) => (i === 0 ? f[0]?.toUpperCase() + f.slice(1) : f))
		.join(" + ");
	return sentence;
}
