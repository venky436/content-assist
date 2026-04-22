/**
 * Single source of truth for the scoring rubric Gemini is graded against.
 *
 * Used by:
 *   - Analyze: the coach prompt that evaluates existing user content.
 *   - Generate: the creation prompt — so new content is written to the same
 *     rubric it will be scored by, preventing the "our own Generate output
 *     scores <85 on our own Analyze" credibility trap.
 *
 * Update this constant and both endpoints move in lockstep.
 *
 * The runtime-enforced version of these rules lives in `computeAdditiveScore`
 * (analyze.clean.ts). Keep the prose here and the scorer code in sync when
 * tuning — any rubric change needs both.
 */
export const QUALITY_RUBRIC_PROSE = [
	"SCORING BANDS:",
	"- 0–40: Weak",
	"- 41–65: Average",
	"- 66–80: Strong",
	"- 81–100: Very Strong",
	"",
	"ADDITIVE SCORING RUBRIC — start from baseline 50, then ADD:",
	"- +12 → clear problem identification",
	"- +12 → strong hook structure (question, tension, or contrast)",
	"- +8  → specificity (numbers, timeframe, or targeted audience)",
	"- +8  → clear value or transformation",
	"- +5  → CTA present",
	"",
	"BONUSES (capped at +8 total — not fully stackable):",
	"- +5 → includes a number OR a timeframe",
	"- +5 → strong emotional trigger",
	"",
	"STRONG SIGNAL BOOSTS (add on top of additions, no cap):",
	"- +5 → structure clarity (≥3 short readable lines, clear flow)",
	"- +7 → positioning (content shows problem → explanation → fix)",
	"- +5 → CTA quality (specific action AND benefit, not just presence)",
	"",
	"STRONG-CONTENT FLOOR: if the content has a clear hook + structured body + clear idea + CTA, score MUST be ≥ 75.",
	"",
	"SEPARATION RULE: if the content feels more actionable, more structured, and more direct than typical average content, the score must land at least 5 points higher than a comparable average piece. Strong content should not score in the same band as informative-but-generic content.",
	"",
	"DEDUCTIONS (max total = −20):",
	"- −6 → vague / generic language",
	"- −6 → weak CTA (\"tag a friend\", \"follow for more\", \"double tap\", etc.)",
	"- −5 → lacks emotional depth",
	"- −5 → too broad / no audience",
	"",
	"GOLDEN RULE: strong content (clear hook + clear problem + clear value) must NEVER drop below 70.",
	"INTERNAL CHECK: if the content has numbers AND a timeframe AND a clear transformation, the score MUST be ≥ 75.",
	"",
	"GENERICITY RULE — treat content as GENERIC if it contains motivational clichés (\"never give up\", \"you can do it\", \"trust the process\", \"keep going\", \"hard work pays off\") OR lacks ≥4 of: specific problem, clear audience, tension, curiosity trigger, specificity. Generic content MUST land in 30–50 range. It should feel Weak — NEVER Average. Apply −20 immediately and cap at 50.",
	"",
	"MEDIUM-PREDICTABLE CAP 70 — if content has some structure and some insight but still feels common or predictable (generic phrasing present, or no clear problem, or no clear value), the score CANNOT exceed 70.",
	"",
	"STRONG THRESHOLD 75 — to score above 75, content MUST have at least ONE of: a specific hook (numbers or targeted audience), strong tension, or a unique insight that isn't common advice.",
	"",
	"ELITE THRESHOLD 85 — to score above 85, content MUST include ALL of: specificity (numbers/timeframe), strong positioning (clear problem), and value clarity (clear transformation).",
	"",
	"HARD CAP 88 — if ANY of these exist, score CANNOT exceed 88: generic phrasing, missing specificity, weak emotional trigger, average or non-benefit CTA.",
	"",
	"PERFECT-SCORE RULE — scores 95+ require ALL of the following:",
	"- Hook is highly specific (contains a number AND an audience marker AND tension/question)",
	"- A clear, unique insight (not common advice)",
	"- Strong emotional AND curiosity trigger",
	"- Benefit-driven CTA (names the outcome)",
	"If ANY are missing, the score MUST NOT exceed 94.",
	"",
	"GOLDEN TRUTH: Good ≠ Perfect. Strong ≠ 100. Only rare content earns 95+.",
].join("\n");
