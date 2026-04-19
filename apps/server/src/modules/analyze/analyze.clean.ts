import type {
	AnalyzeResponse,
	Confidence,
	HookVerdict,
	PriorityArea,
} from "@content-assist/shared";

const BANNED_ADJECTIVES = [
	"engaging",
	"be engaging",
	"add value",
	"better",
	"good",
	"nice",
	"solid",
	"interesting",
	"make it pop",
	"pops",
];

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

const MAX_HOOK_WORDS = 8;
const MAX_PROBLEMS = 3;
const MAX_ISSUES = 3;
const MAX_INSIGHT_CHARS = 320;

type Dimension = "hook" | "emotion" | "cta" | "clarity" | "other";

const DIMENSION_KEYWORDS: Record<Exclude<Dimension, "other">, string[]> = {
	hook: ["hook", "opener", "opening", "headline", "first line", "start"],
	emotion: ["emotion", "pain", "fear", "curiosity", "tension", "feel", "empathy", "struggle"],
	cta: ["cta", "call to action", "comment", "tag", "save", "share", "follow", "dm", "click", "subscribe"],
	clarity: ["clarity", "specific", "specificity", "vague", "generic", "broad", "audience", "positioning", "niche"],
};

function classifyDimension(item: string): Dimension {
	const lower = item.toLowerCase();
	for (const [dim, keywords] of Object.entries(DIMENSION_KEYWORDS) as Array<
		[Exclude<Dimension, "other">, string[]]
	>) {
		if (keywords.some((k) => lower.includes(k))) return dim;
	}
	return "other";
}

function wordSet(s: string): Set<string> {
	return new Set(
		s
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, " ")
			.split(/\s+/)
			.filter((w) => w.length >= 4),
	);
}

function overlapRatio(a: string, b: string): number {
	const setA = wordSet(a);
	const setB = wordSet(b);
	if (setA.size === 0 || setB.size === 0) return 0;
	let overlap = 0;
	for (const w of setA) if (setB.has(w)) overlap++;
	return overlap / Math.max(setA.size, setB.size);
}

function dedupeByDimension(items: string[], max: number): string[] {
	const kept: string[] = [];
	const usedDimensions = new Set<Dimension>();
	for (const item of items) {
		const dim = classifyDimension(item);
		if (dim !== "other" && usedDimensions.has(dim)) continue;
		if (kept.some((e) => overlapRatio(e, item) >= 0.65)) continue;
		kept.push(item);
		if (dim !== "other") usedDimensions.add(dim);
		if (kept.length >= max) break;
	}
	// 2nd pass — if still short, admit items even if dimension repeats, as long as they're not near-identical phrasing
	if (kept.length < max) {
		for (const item of items) {
			if (kept.includes(item)) continue;
			if (kept.some((e) => overlapRatio(e, item) >= 0.85)) continue;
			kept.push(item);
			if (kept.length >= max) break;
		}
	}
	return kept;
}

function padWithDistinct(arr: string[], minCount: number, fillers: string[]): string[] {
	if (arr.length >= minCount) return arr;
	const out = [...arr];
	const lower = new Set(out.map((s) => s.toLowerCase()));
	for (const f of fillers) {
		if (out.length >= minCount) break;
		if (lower.has(f.toLowerCase())) continue;
		out.push(f);
		lower.add(f.toLowerCase());
	}
	return out;
}
const DEFAULT_CONFIDENCE: Confidence = "medium";

const CTA_KEYWORDS = [
	"tag",
	"comment",
	"drop",
	"share",
	"follow",
	"dm",
	"message",
	"save",
	"click",
	"link in bio",
	"bio",
	"check",
	"subscribe",
	"try",
	"download",
	"swipe",
	"watch",
	"join",
	"sign up",
	"signup",
	"register",
];

const CTA_EMOJIS = ["👇", "👆", "⬇️", "⬆️", "🔗"];

function hasCta(input: string): boolean {
	const lower = input.toLowerCase();
	if (/\?\s*$/.test(input.trim())) return true;
	if (CTA_EMOJIS.some((e) => input.includes(e))) return true;
	return CTA_KEYWORDS.some((k) => new RegExp(`\\b${k}\\b`, "i").test(lower));
}

function hasStructuredLines(input: string): boolean {
	const lines = input
		.split(/\r?\n|(?<=[.!?])\s+/)
		.map((l) => l.trim())
		.filter(Boolean);
	return lines.length >= 2;
}

function hasClearHook(originalHook: string): boolean {
	const trimmed = originalHook.trim();
	if (!trimmed) return false;
	return wordCount(trimmed) >= 3 && wordCount(trimmed) <= 20;
}

const HOOK_KEYWORDS = ["hook", "opener", "opening", "curiosity", "intro", "first line"];
const CAPTION_KEYWORDS = ["caption", "cta", "call to action", "long", "cluttered", "ramble", "body"];

const PROBLEM_WORDS = [
	"problem",
	"stuck",
	"wall",
	"struggle",
	"struggling",
	"can't",
	"cant",
	"won't",
	"wont",
	"fails",
	"failing",
	"broken",
	"ignored",
	"quit",
	"drain",
	"plateau",
	"lost",
	"losing",
	"blocker",
	"wasted",
	"wasting",
];

const VALUE_WORDS = [
	"learn",
	"get",
	"stop",
	"start",
	"how to",
	"fix",
	"solve",
	"master",
	"become",
	"double",
	"grow",
	"build",
	"unlock",
	"boost",
	"improve",
	"transform",
	"gain",
	"save",
	"reach",
	"land",
];

const CONTRAST_WORDS = ["but", "vs", "versus", "despite", "instead", "while"];

const EMOTIONAL_SIGNAL_WORDS = [
	"feel",
	"felt",
	"pain",
	"painful",
	"scared",
	"scary",
	"frustrated",
	"exhausted",
	"overwhelmed",
	"lonely",
	"proud",
	"afraid",
	"nervous",
	"confused",
	"desperate",
	"quit",
	"fail",
	"struggle",
	"broken",
	"drained",
];

function containsAny(text: string, words: string[]): boolean {
	const lower = text.toLowerCase();
	return words.some((w) => {
		if (/\s/.test(w) || /[^a-z']/i.test(w)) {
			return lower.includes(w.toLowerCase());
		}
		return new RegExp(`\\b${w}\\b`, "i").test(lower);
	});
}

type ScoreBreakdown = {
	score: number;
	additions: string[];
	deductions: string[];
};

const GENERIC_PHRASING_WORDS = [
	"everyone",
	"success",
	"motivation",
	"hustle",
	"grind",
	"inspiring",
	"truly",
	"amazing",
	"journey",
	"keep going",
	"mindset matters",
	"work hard",
];

const MOTIVATIONAL_CLICHES = [
	"never give up",
	"you can do it",
	"believe in yourself",
	"keep going",
	"you got this",
	"trust the process",
	"dream big",
	"stay positive",
	"hard work pays off",
	"chase your dreams",
	"anything is possible",
	"be the best version",
	"level up your life",
	"rise and grind",
	"no pain no gain",
	"stay focused",
	"stay hungry",
	"stay humble",
];

const CTA_BENEFIT_WORDS = [
	"learn",
	"get",
	"master",
	"unlock",
	"save",
	"grow",
	"double",
	"boost",
	"improve",
	"become",
	"fix",
	"solve",
];

const WEAK_CTA_PATTERNS = [
	/\btag a friend\b/i,
	/\bfollow for more\b/i,
	/\blike and share\b/i,
	/\bdouble tap\b/i,
	/\bdrop a heart\b/i,
	/\bhit follow\b/i,
];

export function computeAdditiveScore(
	input: string,
	originalHook: string,
	problems: string[],
): ScoreBreakdown {
	let score = 50;
	const additions: string[] = ["base:50"];
	const deductions: string[] = [];

	const hook = originalHook.trim();
	const inputLower = input.toLowerCase();

	const numberPresent = /\d/.test(input);
	const timeframePresent = [
		"day",
		"days",
		"week",
		"weeks",
		"month",
		"months",
		"year",
		"years",
		"hour",
		"hours",
		"minute",
		"minutes",
	].some((w) => new RegExp(`\\b${w}\\b`, "i").test(inputLower));
	const audiencePresent =
		/\byou(r|'re|re)?\b/i.test(input) ||
		["creator", "creators", "beginner", "beginners", "founder", "founders"].some(
			(w) => new RegExp(`\\b${w}\\b`, "i").test(inputLower),
		);
	const hookIsQuestion = /\?\s*$/.test(hook);
	const hookHasContrast = containsAny(hook, CONTRAST_WORDS);
	const hookHasTension = [
		"stuck",
		"stop",
		"quit",
		"why",
		"fail",
		"broken",
		"wrong",
		"problem",
		"mistake",
	].some((w) => new RegExp(`\\b${w}\\b`, "i").test(hook));
	const hookHasNumber = /\d/.test(hook);
	const hookHasAudience =
		/\byou(r|'re|re)?\b/i.test(hook) ||
		["creator", "creators", "beginner", "beginners", "founder", "founders"].some(
			(w) => new RegExp(`\\b${w}\\b`, "i").test(hook),
		);
	const problemIdentified = containsAny(input, PROBLEM_WORDS);
	const valuePresent = containsAny(input, VALUE_WORDS);
	const ctaPresent = hasCta(input);
	const emotionalTriggerPresent = containsAny(input, EMOTIONAL_SIGNAL_WORDS);
	const audienceTargeted = audiencePresent;
	const specificityPresent = numberPresent || timeframePresent || audiencePresent;
	const strongHookStructure = hookIsQuestion || hookHasTension || hookHasContrast;
	const genericPhrasingPresent = containsAny(input, GENERIC_PHRASING_WORDS);
	const curiosityTriggerPresent =
		/\?/.test(input) ||
		/\b(why|here'?s|the reason|this is why|do this instead|what if)\b/i.test(inputLower);
	const ctaIsBenefitDriven =
		ctaPresent && CTA_BENEFIT_WORDS.some((w) => new RegExp(`\\b${w}\\b`, "i").test(inputLower));
	const weakCtaPatternPresent = WEAK_CTA_PATTERNS.some((re) => re.test(input));

	// Additions
	if (problemIdentified) {
		score += 12;
		additions.push("+12 problem-identification");
	}
	if (strongHookStructure) {
		score += 12;
		additions.push("+12 hook-structure");
	}
	if (specificityPresent) {
		score += 8;
		additions.push("+8 specificity");
	}
	if (valuePresent) {
		score += 8;
		additions.push("+8 value/transformation");
	}
	if (ctaPresent) {
		score += 5;
		additions.push("+5 cta");
	}

	// Bonuses — max +8 total (not fully stackable)
	let bonus = 0;
	if (numberPresent || timeframePresent) bonus += 5;
	if (emotionalTriggerPresent) bonus += 5;
	bonus = Math.min(bonus, 8);
	if (bonus > 0) {
		score += bonus;
		additions.push(`+${bonus} bonus (number/timeframe + emotion)`);
	}

	// STRONG SIGNAL BOOSTS (V9)
	// Structure clarity: ≥3 short lines, each under 80 chars (reads clean)
	const lines = input
		.split(/\r?\n|(?<=[.!?])\s+/)
		.map((l) => l.trim())
		.filter(Boolean);
	const hasStructureClarity =
		lines.length >= 3 && lines.every((l) => l.length <= 120);
	if (hasStructureClarity) {
		score += 5;
		additions.push("+5 structure-clarity");
	}

	// Positioning: problem → explanation → fix in the same post (all three dimensions + multi-line body)
	const hasProblemExplanationFix =
		problemIdentified && valuePresent && lines.length >= 3;
	if (hasProblemExplanationFix) {
		score += 7;
		additions.push("+7 positioning (problem→explanation→fix)");
	}

	// CTA quality: benefit-driven CTA (stacks on top of +5 CTA presence → total +10 for quality CTA)
	if (ctaIsBenefitDriven) {
		score += 5;
		additions.push("+5 cta-quality (benefit-driven)");
	}

	// Deductions — capped at -20 total
	let deductTotal = 0;
	const addDeduction = (amount: number, label: string) => {
		const remaining = 20 - deductTotal;
		if (remaining <= 0) return;
		const applied = Math.min(amount, remaining);
		deductTotal += applied;
		score -= applied;
		const suffix = applied < amount ? " (capped)" : "";
		deductions.push(`-${applied} ${label}${suffix}`);
	};

	const problemsLower = problems.join(" ").toLowerCase();

	if (genericPhrasingPresent || !specificityPresent) {
		addDeduction(6, "vague-language");
	}
	if (weakCtaPatternPresent) {
		addDeduction(6, "weak-cta");
	}
	if (!emotionalTriggerPresent) {
		addDeduction(5, "lacks-emotional-depth");
	}
	if (
		!audienceTargeted ||
		problemsLower.includes("too broad") ||
		problemsLower.includes("no audience")
	) {
		addDeduction(5, "too-broad");
	}

	// Golden rule: clear hook + clear problem + clear value → min 70
	if (hasClearHook(hook) && problemIdentified && valuePresent) {
		if (score < 70) {
			additions.push("golden-rule → floor 70");
			score = 70;
		}
	}

	// Internal check: number+timeframe + transformation → min 75
	if (numberPresent && timeframePresent && valuePresent) {
		if (score < 75) {
			additions.push("number+timeframe+value → floor 75");
			score = 75;
		}
	}

	// STRONG-CONTENT FLOOR (V9): clear hook + structured body + clear idea + CTA → ≥ 75
	const strongStructuralBundle =
		hasClearHook(hook) &&
		lines.length >= 2 &&
		(problemIdentified || valuePresent) &&
		ctaPresent;
	if (strongStructuralBundle && score < 75) {
		additions.push("strong-content-floor → 75");
		score = 75;
	}

	// SEPARATION RULE (V9): content that reads actionable + structured + direct gets +5 lift, capped at 80
	const isActionableStructuredDirect =
		hasStructureClarity &&
		valuePresent &&
		(hookHasTension || hookIsQuestion || hookHasContrast) &&
		problemIdentified;
	if (isActionableStructuredDirect && score < 80) {
		const before = score;
		score = Math.min(score + 7, 80);
		additions.push(`+${score - before} separation-lift (actionable+structured+direct)`);
	}

	// GENERICITY DETECTION
	// Content is generic if either:
	//  - it contains a motivational cliché AND is missing ≥2 quality signals (so a lone cliché in otherwise-sharp content does NOT flag as generic)
	//  - OR it's missing ≥4 of the quality signals
	const clicheMatch = MOTIVATIONAL_CLICHES.find((phrase) =>
		inputLower.includes(phrase),
	);
	const hasCliche = Boolean(clicheMatch);
	const missingSignalsCount =
		(problemIdentified ? 0 : 1) +
		(audienceTargeted ? 0 : 1) +
		(hookHasTension ? 0 : 1) +
		(curiosityTriggerPresent ? 0 : 1) +
		(specificityPresent ? 0 : 1);
	const isGeneric =
		(hasCliche && missingSignalsCount >= 2) || missingSignalsCount >= 4;

	if (isGeneric) {
		addDeduction(20, hasCliche ? `generic:cliché-"${clicheMatch}"` : "generic:no-unique-signals");
		if (score > 40) {
			deductions.push(`generic:cap → 40 Weak (was ${score})`);
			score = 40;
		}
	}

	// MEDIUM PREDICTABLE CAP at 70
	const isMediumPredictable =
		!isGeneric &&
		(genericPhrasingPresent || !problemIdentified || !valuePresent);
	if (isMediumPredictable && score > 70) {
		deductions.push(`medium-cap:70 (was ${score})`);
		score = 70;
	}

	// STRONG (>75) REQUIRES: specific hook OR strong tension OR unique insight (proxy: problem + no generic)
	const hookIsSpecific = hookHasNumber || hookHasAudience;
	const hasStrongSignal =
		hookIsSpecific ||
		hookHasTension ||
		(problemIdentified && !genericPhrasingPresent);
	if (!hasStrongSignal && score > 75) {
		deductions.push(`strong-threshold:75 (missing specific-hook/tension/insight)`);
		score = 75;
	}

	// ELITE (>85) REQUIRES: specificity + clear problem + value clarity
	const hasAllEliteFoundations = specificityPresent && problemIdentified && valuePresent;
	if (!hasAllEliteFoundations && score > 85) {
		deductions.push(`elite-threshold:85 (needs specificity+problem+value)`);
		score = 85;
	}

	// HARD CAP at 88 — if any weakness signal fires
	const hasWeaknessSignal =
		genericPhrasingPresent ||
		!specificityPresent ||
		!emotionalTriggerPresent ||
		(ctaPresent && !ctaIsBenefitDriven) ||
		weakCtaPatternPresent;
	if (hasWeaknessSignal && score > 88) {
		score = 88;
		additions.push("hard-cap:88 (weakness signal)");
	}

	// PERFECT-SCORE guard — 95+ only if ALL elite signals
	const hookHighlySpecific = hookHasNumber && hookHasAudience && (hookHasTension || hookIsQuestion);
	const allEliteSignals =
		hookHighlySpecific &&
		!genericPhrasingPresent &&
		emotionalTriggerPresent &&
		curiosityTriggerPresent &&
		ctaIsBenefitDriven;
	if (!allEliteSignals && score > 94) {
		score = 94;
		additions.push("perfect-guard:94 (elite signals incomplete)");
	}

	return {
		score: Math.max(0, Math.min(100, Math.round(score))),
		additions,
		deductions,
	};
}

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
	const num = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
	return Math.max(min, Math.min(max, num));
}

function verdictForScore(score: number): HookVerdict {
	if (score <= 40) return "Weak";
	if (score <= 65) return "Average";
	if (score <= 80) return "Strong";
	return "Very Strong";
}

function wordCount(s: string): number {
	return s.split(/\s+/).filter(Boolean).length;
}

function trimToWords(s: string, maxWords: number): string {
	const parts = s.split(/\s+/).filter(Boolean);
	if (parts.length <= maxWords) return s.trim();
	return parts.slice(0, maxWords).join(" ");
}

function stripBanned(raw: string): string {
	if (!raw) return raw;
	let cleaned = raw;
	for (const phrase of [...BANNED_ADJECTIVES, ...AI_SPEAK_WORDS]) {
		const pattern = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "gi");
		cleaned = cleaned.replace(pattern, "specific");
	}
	return cleaned.replace(/\s{2,}/g, " ").trim();
}

function ensureString(v: unknown, fallback = ""): string {
	return typeof v === "string" ? v.trim() : fallback;
}

function ensureStringArray(v: unknown): string[] {
	if (!Array.isArray(v)) return [];
	return v
		.filter((x): x is string => typeof x === "string")
		.map((s) => s.trim())
		.filter(Boolean);
}

function dedupeArray(arr: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const item of arr) {
		const key = item.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(item);
	}
	return out;
}

function capInsight(s: string): string {
	if (!s) return s;
	if (s.length <= MAX_INSIGHT_CHARS) return s;
	const lines = s.split("\n");
	while (lines.length > 1 && lines.join("\n").length > MAX_INSIGHT_CHARS) {
		lines.pop();
	}
	const joined = lines.join("\n");
	if (joined.length <= MAX_INSIGHT_CHARS) return joined;
	const cut = joined.slice(0, MAX_INSIGHT_CHARS - 1);
	const lastSpace = cut.lastIndexOf(" ");
	return `${cut.slice(0, lastSpace > 100 ? lastSpace : cut.length).trimEnd()}…`;
}

function ensureTwoLines(raw: string, fallbackCta = "What would you change?"): string {
	const collapsed = raw.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n");
	const lines = collapsed
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);
	if (lines.length >= 2) return lines.slice(0, 2).join("\n");
	if (lines.length === 1) return `${lines[0]}\n${fallbackCta}`;
	return "";
}

function computePriorityFix(
	score: number,
	problems: string[],
	captionIssueCount: number,
	geminiPick: PriorityArea | null,
): PriorityArea {
	if (score <= 50) return "hook";
	const hookHits = problems.filter((p) =>
		HOOK_KEYWORDS.some((k) => p.toLowerCase().includes(k)),
	).length;
	const captionHits = problems.filter((p) =>
		CAPTION_KEYWORDS.some((k) => p.toLowerCase().includes(k)),
	).length;
	if (hookHits > captionHits) return "hook";
	if (captionHits > hookHits) return "caption";
	if (geminiPick) return geminiPick;
	return captionIssueCount > 0 && score >= 70 ? "caption" : "hook";
}

function parseConfidence(v: unknown): Confidence {
	if (v === "low" || v === "medium" || v === "high") return v;
	return DEFAULT_CONFIDENCE;
}

function parsePriorityPick(v: unknown): PriorityArea | null {
	if (v === "hook" || v === "caption") return v;
	return null;
}

function trimHookToMaxWords(hook: string): string {
	const trimmed = hook.trim();
	if (wordCount(trimmed) <= MAX_HOOK_WORDS) return trimmed;
	return trimToWords(trimmed, MAX_HOOK_WORDS);
}

const TIMEFRAME_WORDS = ["day", "days", "week", "weeks", "month", "months", "year", "years", "hour", "hours", "minute", "minutes"];
const CONSEQUENCE_WORDS = ["why", "because", "reason", "here's", "heres", "fix", "cost", "risk", "losing", "wasting", "costing", "stuck", "broken"];
const AUDIENCE_MARKERS = ["creator", "creators", "beginner", "beginners", "founder", "founders", "maker", "makers"];

function hasNumber(s: string): boolean {
	return /\d/.test(s) || /\b(one|two|three|four|five|ten|twenty|fifty|hundred|thousand|zero)\b/i.test(s);
}

function hasTimeframe(s: string): boolean {
	const lower = s.toLowerCase();
	return TIMEFRAME_WORDS.some((w) => new RegExp(`\\b${w}\\b`, "i").test(lower));
}

function hasConsequence(s: string): boolean {
	const lower = s.toLowerCase();
	return CONSEQUENCE_WORDS.some((w) => new RegExp(`\\b${w.replace(/'/g, "'?")}\\b`, "i").test(lower));
}

function hasAudience(s: string): boolean {
	const lower = s.toLowerCase();
	if (/\byou(r|'re|re)?\b/i.test(s)) return true;
	return AUDIENCE_MARKERS.some((w) => new RegExp(`\\b${w}\\b`, "i").test(lower));
}

export function hasHookUpgradeMarker(hook: string): boolean {
	if (!hook) return false;
	return (
		hasNumber(hook) ||
		hasTimeframe(hook) ||
		hasConsequence(hook) ||
		hasAudience(hook)
	);
}

export function isHookStructurallyDifferent(original: string, rewrite: string): boolean {
	if (!original || !rewrite) return true;
	const a = wordSet(original);
	const b = wordSet(rewrite);
	if (a.size === 0 || b.size === 0) return true;
	let overlap = 0;
	for (const w of a) if (b.has(w)) overlap++;
	const ratio = overlap / Math.max(a.size, b.size);
	return ratio < 0.65;
}

export function isCaptionNotWeaker(inputCaption: string, improved: string): boolean {
	const inputLen = inputCaption.trim().length;
	const improvedLen = improved.trim().length;
	if (inputLen <= 60) return true; // too short to meaningfully compare
	if (improvedLen >= 80) return true;
	return improvedLen >= Math.round(inputLen * 0.4);
}

export type AnalyzeFailure =
	| "hook_no_upgrade_marker"
	| "hook_same_structure"
	| "caption_weaker_than_input"
	| "duplicate_items"
	| "rewrite_weaker_than_input";

export function buildImprovedPost(betterHook: string, improvedCaption: string): string {
	return `${betterHook.trim()}\n${improvedCaption.trim()}`;
}

function hasDuplicateItems(problems: string[], captionIssues: string[]): boolean {
	const combined = [...problems, ...captionIssues];
	for (let i = 0; i < combined.length; i++) {
		const a = combined[i];
		if (!a) continue;
		for (let j = i + 1; j < combined.length; j++) {
			const b = combined[j];
			if (!b) continue;
			if (overlapRatio(a, b) >= 0.8) return true;
		}
	}
	return false;
}

export function validateAnalysis(
	cleaned: AnalyzeResponse,
	inputContent: string,
): AnalyzeFailure[] {
	const failures: AnalyzeFailure[] = [];
	if (!hasHookUpgradeMarker(cleaned.betterHook)) {
		failures.push("hook_no_upgrade_marker");
	}
	if (!isHookStructurallyDifferent(cleaned.originalHook, cleaned.betterHook)) {
		failures.push("hook_same_structure");
	}
	const inputCaption = inputContent.split("\n").slice(1).join("\n") || inputContent;
	if (!isCaptionNotWeaker(inputCaption, cleaned.improvedCaption)) {
		failures.push("caption_weaker_than_input");
	}
	if (hasDuplicateItems(cleaned.problems, cleaned.captionIssues)) {
		failures.push("duplicate_items");
	}

	// Consistency check: rewrite must score ≥ original when re-analyzed
	const originalScore = computeAdditiveScore(
		inputContent,
		cleaned.originalHook,
		cleaned.problems,
	).score;
	const rewriteScore = computeAdditiveScore(
		cleaned.improvedPost,
		cleaned.betterHook,
		[],
	).score;
	if (rewriteScore < originalScore) {
		failures.push("rewrite_weaker_than_input");
	}

	return failures;
}

const FAILURE_MESSAGES: Record<AnalyzeFailure, string> = {
	hook_no_upgrade_marker:
		"The \"betterHook\" is missing a specific number, timeframe, consequence, or targeted audience. Rewrite it to include at least one of these.",
	hook_same_structure:
		"The \"betterHook\" is too similar in structure to the originalHook — it reads as a minor wording swap. Rewrite with a fundamentally different sentence shape.",
	caption_weaker_than_input:
		"The \"improvedCaption\" is shorter and shallower than the input caption — it strips value. Rewrite it keeping the original's depth and teaching in tighter language.",
	duplicate_items:
		"Two entries across problems[] or captionIssues[] target the same concept. Replace one with a different dimension (hook specificity / emotional trigger / CTA strength / clarity).",
	rewrite_weaker_than_input:
		"The rewritten post (betterHook + improvedCaption) scores LOWER than the original when re-analyzed. Strengthen it: add a specific number/timeframe/audience, sharpen the problem, and make the CTA benefit-driven. The rewrite MUST score equal or higher than the input.",
};

export function failureMessages(failures: AnalyzeFailure[]): string[] {
	return failures.map((f) => FAILURE_MESSAGES[f]);
}

export function cleanAnalysis(raw: unknown, input?: string): AnalyzeResponse | null {
	if (typeof raw !== "object" || raw === null) return null;
	const record = raw as Record<string, unknown>;

	const rawScore = clampInt(record.score, 0, 100, 0);
	const originalHook = ensureString(record.originalHook);
	const inputText = (input ?? "").trim();
	const rawProblemsForScoring = ensureStringArray(record.problems);

	const additive = inputText
		? computeAdditiveScore(inputText, originalHook, rawProblemsForScoring)
		: null;
	const score = additive ? additive.score : rawScore;

	const verdict = verdictForScore(score);
	const explanation = stripBanned(ensureString(record.explanation));

	const rawProblems = dedupeArray(
		ensureStringArray(record.problems)
			.map(stripBanned)
			.map((s) => s.replace(/\.+$/, ""))
			.filter(Boolean),
	);
	let problems = dedupeByDimension(rawProblems, MAX_PROBLEMS);
	problems = padWithDistinct(problems, 2, [
		"Could sharpen audience positioning",
		"Could strengthen the emotional angle",
		"Could add a more specific CTA",
	]);

	const rawIssues = dedupeArray(
		ensureStringArray(record.captionIssues)
			.map(stripBanned)
			.map((s) => s.replace(/\.+$/, ""))
			.filter(Boolean),
	);
	let captionIssues = dedupeByDimension(rawIssues, MAX_ISSUES);
	captionIssues = padWithDistinct(captionIssues, 2, [
		"Opening line could be more specific",
		"CTA could name a clearer outcome",
		"Body line could carry more tension",
	]);

	const betterHook = trimHookToMaxWords(ensureString(record.betterHook));
	const hookReason = stripBanned(ensureString(record.hookReason));
	const improvedCaption = ensureTwoLines(ensureString(record.improvedCaption));
	const captionReason = stripBanned(ensureString(record.captionReason));
	const insight = capInsight(stripBanned(ensureString(record.insight)));
	const quickFix = stripBanned(ensureString(record.quickFix));
	const confidence = parseConfidence(record.confidence);
	const geminiPriorityPick = parsePriorityPick(record.priorityFix);
	const priorityFix = computePriorityFix(
		score,
		problems,
		captionIssues.length,
		geminiPriorityPick,
	);

	if (
		!explanation ||
		!originalHook ||
		!betterHook ||
		!hookReason ||
		!improvedCaption ||
		!captionReason ||
		!insight ||
		!quickFix
	) {
		return null;
	}

	const improvedPost = buildImprovedPost(betterHook, improvedCaption);

	return {
		score,
		verdict,
		explanation,
		originalHook,
		quickFix,
		problems,
		captionIssues,
		betterHook,
		hookReason,
		improvedCaption,
		captionReason,
		improvedPost,
		insight,
		priorityFix,
		confidence,
	};
}
