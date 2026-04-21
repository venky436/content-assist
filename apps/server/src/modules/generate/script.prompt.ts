import type { ContentType } from "@content-assist/shared";

const FORMAT_HINT: Record<ContentType, string> = {
	reel: "Target format: Reel (short vertical video, first 3 seconds are the hook, creator speaks directly to camera).",
	image: "Target format: Image Post (single frame; treat the script as caption-led voiceover or copy block).",
	story: "Target format: Story (24h ephemeral, casual tone, short tap-through lines).",
};

const SCRIPT_TASK_BLOCK = [
	"TASK:",
	"You are writing the exact words a creator will SAY on camera, plus hashtags they'll paste in the Instagram caption.",
	"Produce:",
	"1. One HOOK — the first line, designed to stop the scroll. Max 120 characters, ideally under 12 words.",
	"2. Between 3 and 5 SPOKEN LINES — the body of the script. Each line ≤ 140 characters. One idea per line.",
	"3. One CTA — a single closing line that asks for a specific action. ≤ 120 characters.",
	"4. Exactly 10 HASHTAGS — no duplicates, no spaces inside a tag, mix of niche + broad + India-relevant + 1–2 emotional/problem-based tags. Tags a real creator would pick.",
];

const SCRIPT_RULES_BLOCK = [
	"SCRIPT RULES:",
	"- Write in a natural, spoken voice — first-person or direct \"you\" framing. Sounds like a human talking, not a writer narrating.",
	"- One idea per line. Each line builds on the last. No filler, no hedging (\"kind of\", \"sort of\", \"maybe\"), no throat-clearing (\"so\", \"basically\", \"honestly\").",
	"- Short sentences. Punchy. The creator should be able to read each line in one breath.",
	"- No hashtags, no emoji, no stage directions, no square-bracket notes.",
	"- Hook follows the same quality bar as our viral hooks: specific, creates curiosity or tension, open-loop preferred.",
	"- Hook must carry topic context (name the domain — gym, study, creator growth, money, etc.). No generic \"are you making this mistake?\"",
	"- Body lines must deliver on the hook's promise — the problem → the shift → the proof — in that arc when possible.",
	"- CTA must be specific and benefit-driven. Avoid \"tag a friend\" / \"double tap\" / \"like if you agree\" — those are dead.",
	"- Banned adjectives (NEVER use): \"engaging\", \"better\", \"good\", \"nice\", \"solid\", \"interesting\", \"make it pop\", \"game changer\", \"level up\", \"unleash\", \"transform your life\", \"unlock your potential\", \"shocking\", \"mind-blowing\".",
	"- No soft-consoling filler: \"it's not your fault\", \"you got this\", \"you're not alone\". Direct confident tone.",
];

const FINAL_BEHAVIOR_BLOCK = [
	"FINAL BEHAVIOR:",
	"- Act like a creator who actually performs on camera. Write what YOU would say.",
	"- Every line you write should pass the test: \"I would say this out loud on camera.\"",
];

const OUTPUT_FORMAT_BLOCK = [
	"STRICT OUTPUT FORMAT:",
	"Return ONLY valid JSON. No explanation. No markdown fences.",
	'{ "hook": "", "lines": ["", "", ""], "cta": "", "hashtags": [] }',
];

export function buildScriptPrompt(input: {
	idea: string;
	contentType: ContentType;
	stronger: boolean;
	avoidHooks?: string[];
}): string {
	const formatHint = FORMAT_HINT[input.contentType];

	const intensityBlock = input.stronger
		? [
				"",
				"MAKE THIS SCRIPT SHARPER:",
				"- Rewrite the hook with sharper specificity or a tension lever the avoided list doesn't use.",
				"- Increase tension and curiosity. Tighter words. Zero safe phrasing.",
				"- Still honest — no clickbait, no hostile tone, no false claims.",
			]
		: [];

	const avoidBlock =
		input.avoidHooks && input.avoidHooks.length > 0
			? [
					"",
					"AVOID these exact hook openers (they were shown already — produce different wording AND different structure):",
					...input.avoidHooks.map((h) => `- ${h}`),
				]
			: [];

	return [
		"You are an expert Instagram scriptwriter for on-camera creators.",
		"You write short spoken scripts that creators can read aloud in a reel or story.",
		"",
		"Given this idea:",
		`"${input.idea}"`,
		formatHint,
		"",
		...SCRIPT_TASK_BLOCK,
		"",
		...SCRIPT_RULES_BLOCK,
		...intensityBlock,
		...avoidBlock,
		"",
		...FINAL_BEHAVIOR_BLOCK,
		"",
		...OUTPUT_FORMAT_BLOCK,
	].join("\n");
}
