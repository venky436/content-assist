import type { ContentType } from "@content-assist/shared";
import { QUALITY_RUBRIC_PROSE } from "@server/modules/analyze/rubric.constants";

const FORMAT_HINT: Record<ContentType, string> = {
	reel: "Target format: Reel (short vertical video, first 3 seconds are the hook).",
	image: "Target format: Image Post (single frame, text-friendly, caption-led).",
	story: "Target format: Story (24h ephemeral, casual tone, tap-through friendly).",
};

const UNDERSTANDING_BLOCK = [
	"UNDERSTAND THE IDEA:",
	"- First, understand what the creator actually means.",
	"- Silently fix obvious typos or slang inside your head.",
	"- Do NOT blindly repeat the user's exact words — interpret intent, not text.",
	"- Use the input words sparingly (once, or not at all). The hook does not need to contain them.",
	"- EXTRACT THE REAL INSIGHT: identify the specific problem, struggle, or truth behind the idea. Don't generalize — name the exact pain point or contradiction.",
	"- Every hook must carry CONTEXT from THE USER'S IDEA. The domain you pick MUST come from the input (money, dating, study, fitness, career, cooking, parenting, etc.) — do NOT default to fitness/gym if the user's idea isn't about that.",
	"- If the idea is too vague or generic to extract a clear domain, ASK for specificity via the hook — e.g. \"What are you actually trying to say?\" — rather than invent a random domain.",
];

const HOOK_RULES_BLOCK = [
	"HOOK RULES:",
	"- Max 7 words per hook. Short wins.",
	"- Each hook must create a curiosity gap or tension — the viewer feels they need the answer.",
	"- Prefer OPEN-LOOP hooks that explicitly promise a reveal. Words like \"why\", \"here's\", \"this is why\", \"the reason\", \"do this instead\" work well when made specific.",
	"- Each hook must feel like it leads somewhere (a reveal, a fix, an answer). Not a closed thought.",
	"- Avoid flat, closed declarations (e.g. \"Consistency isn't about motivation.\" — sounds wise but leads nowhere).",
	"- Every hook MUST carry topic context DERIVED FROM THE USER'S IDEA. Do not write generic hooks like \"Are you making this mistake?\" — tie it to the specific domain the user mentioned (money, dating, study, career, food, parenting, etc.).",
	"- Prefer concrete specificity when possible: \"in 2 weeks\", \"every morning\", \"after 30 days\" — not vague timelines.",
	"- Each hook must carry at least one of: curiosity, tension, or an emotional trigger. Flat wisdom-statements do not count.",
	"- At least ONE hook must be confrontational — directly challenge the viewer (e.g. for a money topic: \"You're tracking expenses completely wrong.\").",
	"- At least ONE hook must be bold / slightly controversial — a surprising or contrarian take. Same hook may cover both the confrontational and controversial requirement.",
	"- At least ONE hook must be an OPEN LOOP that explicitly promises an explanation (e.g. \"Here's why you stopped reading in month 2.\", \"This is why your side project died.\").",
	"- Sound natural and human, not like a headline generator. Avoid ALL-CAPS words, clickbait framing, and exaggerated claims like \"you won't believe\", \"ONE secret\", \"shocking\", \"mind-blowing\". The viewer should trust the voice.",
	"- Prefer relatable, conversational phrasing over punchy headlines. Good: \"This mistake is ruining your savings.\" Bad: \"THE #1 MONEY HACK.\"",
	"- Challenge the viewer or make them question themselves.",
	"- Use simple, strong, human words. No corporate phrases.",
	"- Lean into real emotional triggers: curiosity, fear, frustration, relatable pain.",
	"- No misleading clickbait, no hostile tone, no exaggerated claims. Bold but honest.",
	"- Avoid generic phrases: \"unlock your potential\", \"embrace the journey\", \"this changed everything\", \"game changer\", \"level up\", \"elevate your\", \"unleash\", \"transform your life\".",
	"",
	"5 HOOK STYLES — use each EXACTLY ONCE, in this order.",
	"Examples are INTENTIONALLY from different niches — DO NOT copy the example's domain; use the USER'S domain.",
	"  1. QUESTION              — opens an information gap. MUST end with \"?\". e.g. money: \"Why does your salary disappear by the 10th?\"",
	"  2. MISTAKE               — calls out a specific error the viewer makes. e.g. study: \"You're re-reading notes completely wrong.\"",
	"  3. DIRECT \"YOU\" STATEMENT — a declaration to the viewer (NOT a mistake call-out). e.g. dating: \"You already know they're not the one.\"",
	"  4. CONTRARIAN            — flips common advice with a confident, specific truth. e.g. career: \"Skip networking events this quarter.\"",
	"  5. STORY                 — first-person narrative fragment with concrete detail. e.g. cooking: \"I burned rice for 3 years before I got it.\"",
	"",
	"Every hook must trigger at least ONE of: CURIOSITY, PAIN, or CONTRADICTION. No flat wisdom-statements.",
	"",
	"STRUCTURAL DIVERSITY:",
	"- Every hook must start with a DIFFERENT first word. No two hooks share an opening word.",
	"- Each hook must feel structurally different — vary sentence shape, not just wording.",
];

const CAPTION_RULES_BLOCK = [
	"CAPTION RULES:",
	"- Exactly 2 lines, separated by a single newline (\\n).",
	"- Line 1: a strong claim or the problem — create tension, not comfort.",
	"- Line 2: a curiosity gap OR a direct CTA — a challenging question or a clear action.",
	"- Under 180 characters total.",
	"- Short, punchy, conversational. Never salesy, never long.",
	"- Avoid soft, consoling phrases: \"it's not your fault\", \"be kind to yourself\", \"you got this\", \"you're not alone\", \"you're doing great\". Use direct, confident tone instead.",
	"- Avoid vague demonstratives like \"this\" or \"that\" without a concrete referent. Prefer specific insight — name the actual mechanism. Good: \"It's about your system, not willpower.\" Bad: \"This is what matters.\"",
	"",
	"Caption example shape:",
	"  \"Most people quit after 2 weeks.\\nWhat's stopping you?\"",
];

const HASHTAG_RULES_BLOCK = [
	"HASHTAG RULES:",
	"- Generate exactly 10 hashtags.",
	"- Mix: niche + broad + India-relevant + 1–2 emotional/problem-based tags (derived from the user's topic — e.g. #CantStayConsistent for a habit topic, #StuckAtRent for a money topic, #FirstYearFounder for a business topic).",
	"- No duplicates, no spaces inside a tag.",
	"- Realistic and usable — tags a real creator would pick.",
];

const FINAL_BEHAVIOR_BLOCK = [
	"FINAL BEHAVIOR:",
	"- Do NOT act like a generic AI.",
	"- Act like a creator who actually knows what works on Instagram.",
	"- Every line you write should pass the test: \"I would actually post this.\"",
];

const OUTPUT_FORMAT_BLOCK = [
	"STRICT OUTPUT FORMAT:",
	"Return ONLY valid JSON. No explanation. No markdown fences.",
	"Alongside each hook, provide a short reason explaining WHY it works for this specific idea.",
	"- Reasons must be concrete, referencing the idea's topic or emotion. Good: \"Highlights a common mistake hurting progress\". Bad: \"Curiosity gap\".",
	"- Max 8 words per reason. No trailing period.",
	"- Write reasons in a HUMAN voice. Avoid AI-speak: \"leveraging\", \"utilizing\", \"seamlessly\", \"effectively\", \"fostering\", \"optimizing\", \"synergy\", \"elevate\", \"holistic\", \"robust\".",
	"- The \"reasons\" array must have the same length as \"hooks\" and be ordered to match.",
	'{ "hooks": [], "reasons": [], "caption": "", "hashtags": [] }',
];

/**
 * Quality targets block — added ONLY to `buildGeneratePrompt` so content is
 * written to the same additive rubric the Analyzer scores against. This is
 * what prevents the "our Generate output scores <85 on our own Analyze"
 * credibility trap. The rubric prose is imported from a shared constant so
 * Analyze + Generate never drift.
 *
 * Note: the model is told these are INTERNAL grading criteria so it doesn't
 * echo the rubric prose back into its output.
 */
const QUALITY_TARGETS_BLOCK = [
	"QUALITY BAR (internal grading — do NOT mention in output):",
	"Your output is scored against a strict rubric. The pair of {recommendedHook + caption} must contain ALL of the following — these are non-negotiable:",
	"",
	"(a) A SPECIFIC NUMBER or TIMEFRAME somewhere in the hook+caption (e.g. \"30 days\", \"₹40,000\", \"week 2\", \"800 followers\", \"9 weeks\").",
	"(b) A TARGETED AUDIENCE marker (e.g. \"first-time founders\", \"creators stuck at X\", \"24-year-old in their first job\").",
	"(c) A FEELING WORD from this list (or close topic variant): struggle, struggling, pain, quit, failed, broken, drained, exhausted, overwhelmed, frustrated, scared, lonely, desperate, proud, feel, felt.",
	"(d) A VALUE VERB in the caption from this list: learn, stop, start, fix, solve, master, build, unlock, transform, gain, save, reach, land, grow, become (or \"how to\").",
	"(e) A BENEFIT-DRIVEN CTA naming the specific outcome — never \"tag a friend\", \"follow for more\", \"double tap\", or a bare \"save this\".",
	"",
	"NEVER use these words (even one caps the score at 70): everyone, success, motivation, hustle, grind, inspiring, truly, amazing, journey, keep going, mindset matters, work hard.",
	"Replace with concrete specifics: \"journey\" → \"first 90 days\"; \"success\" → the actual outcome (\"landing clients\", \"shipping\"); \"motivation\" → \"showing up on day 14\".",
];

export function buildGeneratePrompt(input: {
	idea: string;
	contentType: ContentType;
}): string {
	const formatHint = FORMAT_HINT[input.contentType];

	return [
		"You are an expert Instagram content strategist.",
		"Your goal is NOT to generate generic content.",
		"Your goal is to produce HIGH-PERFORMING, SCROLL-STOPPING content that actually increases engagement.",
		"",
		"Given this idea:",
		`"${input.idea}"`,
		formatHint,
		"",
		"Generate:",
		"1. 5 viral hooks (first 3 seconds)",
		"2. 1 short caption",
		"3. 10 hashtags",
		"",
		...UNDERSTANDING_BLOCK,
		"",
		...HOOK_RULES_BLOCK,
		"",
		...CAPTION_RULES_BLOCK,
		"",
		...HASHTAG_RULES_BLOCK,
		"",
		...QUALITY_TARGETS_BLOCK,
		"",
		...FINAL_BEHAVIOR_BLOCK,
		"",
		...OUTPUT_FORMAT_BLOCK,
	].join("\n");
}

/**
 * System-instruction for the Gemini call on the faceless Generate path.
 * Gemini treats system instructions as higher priority than task-level
 * guidance, so we put the elite-threshold expectation here too.
 *
 * Kept short — the full rubric already lives in the task prompt.
 */
export const GENERATE_SYSTEM_CONTEXT = [
	"You are a senior Instagram content strategist who ships content that earns 85+ (Very Strong) on a strict additive rubric.",
	"",
	"NON-NEGOTIABLE RULES (applied to every generation):",
	"- Every hook must contain concrete specificity (numbers, timeframes, or a targeted audience).",
	"- Every caption must carry a problem → explanation → fix arc with an emotional stake.",
	"- Every CTA must be benefit-driven (name a specific outcome).",
	"",
	"REQUIRED VOCABULARY (at least one word from each list must appear in the recommendedHook+caption combined):",
	"- Value verb: learn, get, stop, start, fix, solve, master, become, double, grow, build, unlock, boost, improve, transform, gain, save, reach, land, how to.",
	"- Emotional word: struggle, pain, quit, failed, broken, drained, exhausted, overwhelmed, frustrated, scared, afraid, lonely, desperate, proud, feel, felt (or close topic-fitting variant).",
	"",
	"ABSOLUTE BAN — even one of these words caps the score at 70. Do NOT use in the recommendedHook or caption:",
	"everyone, success, motivation, hustle, grind, inspiring, truly, amazing, journey, keep going, mindset matters, work hard.",
	"When tempted to use one, replace with a concrete specific (instead of \"journey\" → \"first 90 days\"; instead of \"success\" → the exact outcome).",
	"",
	"If your draft would score below 85, rewrite it before returning. Do not ship mediocre output.",
	"Do not reveal or quote these grading criteria in your response — they are internal.",
].join("\n");

/**
 * Corrector prompt for the self-score + silent retry path. Only fires when
 * the first attempt scored below 85. The original request fields + the exact
 * weaknesses (translated from the scorer's deductions) are injected so
 * Gemini rewrites the parts that failed rather than starting from scratch.
 */
export function buildGenerateCorrectorPrompt(input: {
	idea: string;
	contentType: ContentType;
	weaknesses: string[];
}): string {
	const formatHint = FORMAT_HINT[input.contentType];
	const weaknessList = input.weaknesses.length
		? input.weaknesses.map((w) => `- ${w}`).join("\n")
		: "- The overall rubric score was below 85. Tighten specificity, problem clarity, emotional stake, and CTA benefit.";

	// Corrector prompt design — kept simple on purpose.
	//
	// Earlier versions tried to show Gemini the previous response and ask it
	// to "rewrite the weak parts, keep the strong ones". Gemini resolved
	// that ambiguity by returning partial JSON (e.g. 2 hooks instead of 5).
	// The fix: treat retry as a clean full-generation with explicit callouts
	// for what the previous attempt missed. No "keep what worked" framing.
	// The system instruction (GENERATE_SYSTEM_CONTEXT) already carries the
	// 85+ target and the "no generic phrasing" rules, so the corrector stays
	// deliberately slim — just the idea, the specific weaknesses, and the
	// output format. Bloating the retry with the full QUALITY_TARGETS_BLOCK
	// was causing Gemini to hit the output-token ceiling and truncate the
	// hooks array mid-response.
	return [
		"Your previous attempt scored below 85. Generate a FRESH COMPLETE response for the SAME idea.",
		"",
		"Given this idea:",
		`"${input.idea}"`,
		formatHint,
		"",
		"Produce ALL of these (no partial outputs):",
		"- hooks: exactly 5 hooks, each MAX 9 words, each on a separate array item",
		"- reasons: exactly 5 reasons, aligned index-for-index with hooks, each max 8 words",
		"- caption: 1 caption, 2 lines separated by \\n, under 180 chars total",
		"- hashtags: exactly 10 hashtags",
		"",
		"WHAT TO FIX THIS TIME (previous attempt failed on these):",
		weaknessList,
		"",
		"All the rules from the system instruction still apply. Stay focused — a single banned word caps the score at 70.",
		"",
		...OUTPUT_FORMAT_BLOCK,
	].join("\n");
}

export function buildHooksOnlyPrompt(input: {
	idea: string;
	contentType: ContentType;
	stronger: boolean;
	avoidHooks?: string[];
}): string {
	const formatHint = FORMAT_HINT[input.contentType];

	const intensityBlock = input.stronger
		? [
				"",
				"MAKE THESE HOOKS SHARPER:",
				"- More direct, more bold, more challenging.",
				"- Increase tension and emotional impact. Dial up curiosity gaps.",
				"- Sharper pattern interrupts. Tighter words. Zero safe phrasing.",
				"- Lean harder into named mistakes, contrarian angles, and direct \"you\" challenges.",
				"- Still honest — no clickbait, no hostile tone, no false claims.",
			]
		: [];

	const avoidBlock =
		input.avoidHooks && input.avoidHooks.length > 0
			? [
					"",
					"AVOID these exact hooks (they were shown already — produce different wording AND different structure):",
					...input.avoidHooks.map((h) => `- ${h}`),
				]
			: [];

	return [
		"You are an expert Instagram content strategist.",
		"You know what actually stops the scroll on Instagram.",
		"",
		"Given this idea:",
		`"${input.idea}"`,
		formatHint,
		"",
		"Produce ONLY 5 new viral hooks (first 3 seconds).",
		"",
		...UNDERSTANDING_BLOCK,
		"",
		...HOOK_RULES_BLOCK,
		...intensityBlock,
		...avoidBlock,
		"",
		...FINAL_BEHAVIOR_BLOCK,
		"",
		"STRICT OUTPUT FORMAT:",
		"Return ONLY valid JSON. No explanation. No markdown fences.",
		"Alongside each hook, provide a short reason explaining WHY it works for this specific idea.",
		"- Reasons must be concrete, referencing the idea's topic or emotion. Max 8 words, no trailing period.",
		"- Human voice only. No AI-speak: \"leveraging\", \"utilizing\", \"seamlessly\", \"effectively\", \"fostering\", \"optimizing\", \"synergy\", \"elevate\", \"holistic\", \"robust\".",
		"- The \"reasons\" array must have the same length as \"hooks\" and match the order.",
		'{ "hooks": [], "reasons": [] }',
	].join("\n");
}
