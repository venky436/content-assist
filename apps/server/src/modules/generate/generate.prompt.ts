import type { ContentType } from "@content-assist/shared";

const FORMAT_HINT: Record<ContentType, string> = {
	reel: "Target format: Reel (short vertical video, first 3 seconds are the hook).",
	image: "Target format: Image Post (single frame, text-friendly, caption-led).",
	story: "Target format: Story (24h ephemeral, casual tone, tap-through friendly).",
};

const UNDERSTANDING_BLOCK = [
	"UNDERSTAND THE IDEA:",
	"- First, understand what the creator actually means.",
	"- Silently fix obvious typos or slang inside your head (e.g. \"zym\" means \"gym\").",
	"- Do NOT blindly repeat the user's exact words — interpret intent, not text.",
	"- Use the input words sparingly (once, or not at all). The hook does not need to contain them.",
	"- EXTRACT THE REAL INSIGHT: identify the specific problem, struggle, or truth behind the idea. Don't generalize — name the exact pain point or contradiction.",
	"- Every hook must carry CONTEXT: the problem AND the domain (e.g. \"gym\", \"study\", \"side income\"). A hook that could apply to any topic is too generic.",
];

const HOOK_RULES_BLOCK = [
	"HOOK RULES:",
	"- Max 7 words per hook. Short wins.",
	"- Each hook must create a curiosity gap or tension — the viewer feels they need the answer.",
	"- Prefer OPEN-LOOP hooks that explicitly promise a reveal. Words like \"why\", \"here's\", \"this is why\", \"the reason\", \"do this instead\" work well when made specific.",
	"- Each hook must feel like it leads somewhere (a reveal, a fix, an answer). Not a closed thought.",
	"- Avoid flat, closed declarations (e.g. \"Consistency isn't about motivation.\" — sounds wise but leads nowhere).",
	"- Every hook MUST carry topic context from the idea (e.g. \"gym\", \"study\", \"business\"). Do not write generic hooks like \"Are you making this mistake?\" — make it \"Are you making this gym mistake?\"",
	"- Prefer concrete specificity when possible: \"in 2 weeks\", \"every morning\", \"after 30 days\" — not vague timelines.",
	"- Each hook must carry at least one of: curiosity, tension, or an emotional trigger. Flat wisdom-statements do not count.",
	"- At least ONE hook must be confrontational — directly challenge the viewer (e.g. \"You're training completely wrong.\", \"Your gym routine is broken.\").",
	"- At least ONE hook must be bold / slightly controversial — a surprising or contrarian take (e.g. \"Gym motivation is a scam.\"). Same hook may cover both the confrontational and controversial requirement.",
	"- At least ONE hook must be an OPEN LOOP that explicitly promises an explanation (e.g. \"Here's why you quit the gym in 2 weeks.\", \"This is why your plan failed.\").",
	"- Sound natural and human, not like a headline generator. Avoid ALL-CAPS words, clickbait framing, and exaggerated claims like \"you won't believe\", \"ONE secret\", \"shocking\", \"mind-blowing\". The viewer should trust the voice.",
	"- Prefer relatable, conversational phrasing over punchy headlines. Good: \"This mistake is ruining your gym progress.\" Bad: \"THE #1 WORKOUT HACK.\"",
	"- Challenge the viewer or make them question themselves.",
	"- Use simple, strong, human words. No corporate phrases.",
	"- Lean into real emotional triggers: curiosity, fear, frustration, relatable pain.",
	"- No misleading clickbait, no hostile tone, no exaggerated claims. Bold but honest.",
	"- Avoid generic phrases: \"unlock your potential\", \"embrace the journey\", \"this changed everything\", \"game changer\", \"level up\", \"elevate your\", \"unleash\", \"transform your life\".",
	"",
	"5 HOOK STYLES — use each EXACTLY ONCE, in this order:",
	"  1. QUESTION              — opens an information gap. MUST end with \"?\". e.g. \"Why did you quit gym at week 2?\"",
	"  2. MISTAKE               — calls out a specific error the viewer makes. e.g. \"You're skipping warm-ups wrong.\"",
	"  3. DIRECT \"YOU\" STATEMENT — a declaration to the viewer (NOT a mistake call-out). e.g. \"You already know the answer.\"",
	"  4. CONTRARIAN            — flips common advice with a confident, specific truth. e.g. \"Skip leg day this week.\"",
	"  5. STORY                 — first-person narrative fragment with concrete detail. e.g. \"I quit the gym on day 13.\"",
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
	"- Mix: niche + broad + India-relevant + 1–2 emotional/problem-based tags (e.g. #StrugglingWithGym, #CantStayConsistent).",
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
		...FINAL_BEHAVIOR_BLOCK,
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
