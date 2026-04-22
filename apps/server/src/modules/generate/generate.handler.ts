import type { RouteHandler } from "@hono/zod-openapi";
import {
	generateResponseSchema,
	type ContentType,
	type GenerateResponse,
} from "@content-assist/shared";
import { logger } from "@server/lib/logger";
import type { AppEnv } from "@server/middleware/auth.middleware";
import { GeminiError, generateJson } from "@server/services/gemini";
import {
	computeAdditiveScore,
	type ScoreBreakdown,
} from "@server/modules/analyze/analyze.clean";
import {
	buildReasonMap,
	cleanCaption,
	cleanHashtags,
	cleanHooks,
	pickRecommendedHook,
	reasonFor,
} from "@server/modules/generate/generate.clean";
import { normalizeIdea } from "@server/modules/generate/generate.normalize";
import {
	GENERATE_SYSTEM_CONTEXT,
	buildGenerateCorrectorPrompt,
	buildGeneratePrompt,
} from "@server/modules/generate/generate.prompt";
import type { generateRoute } from "@server/modules/generate/generate.schema";

/** Target the content must clear on our internal scorer before we ship it. */
const QUALITY_TARGET_SCORE = 85;

/**
 * Translate the scorer's deduction signals into human-readable rewrite
 * guidance we feed back to Gemini on a retry. Each deduction points at a
 * concrete fix — "your CTA was generic" is more actionable than "score 72".
 *
 * Keep in sync with the deduction tags produced in analyze.clean.ts.
 */
function weaknessesForDeductions(deductions: string[]): string[] {
	const out: string[] = [];
	for (const d of deductions) {
		// `medium-cap:70 (was 83)` tag indicates generic phrasing or missing
		// problem/value. The scorer doesn't tell us which, so we flag all three.
		if (d.startsWith("medium-cap")) {
			out.push(
				"Your previous attempt hit the generic-phrasing cap. Remove ALL of these words: journey, success, motivation, hustle, grind, amazing, inspiring, truly, keep going, mindset matters, work hard, everyone. Replace each with a concrete specific (exact outcome, exact number, exact word for the emotion).",
			);
			out.push(
				"Your previous caption also may not have clearly identified the problem and the transformation. Make the problem explicit in line 1, the fix or lesson explicit in line 2.",
			);
			continue;
		}
		switch (d) {
			case "vague-language":
				out.push(
					"Your previous attempt used vague adjectives (engaging, better, nice, etc.). Replace with concrete verbs and specifics.",
				);
				break;
			case "weak-cta":
				out.push(
					"Your CTA was generic ('tag a friend' / 'follow for more' / 'double tap' / bare 'save this'). Rewrite it to name a specific benefit the reader gets.",
				);
				break;
			case "lacks-emotional-depth":
				out.push(
					"Your previous attempt had no feeling-words the scorer recognises. Use at least ONE of these (or a close variant that fits the topic): struggle, pain, quit, failed, broken, drained, exhausted, overwhelmed, frustrated, scared, afraid, lonely, desperate, proud, feel, felt. Put it in the recommended hook OR the caption.",
				);
				break;
			case "too-broad":
				out.push(
					"Narrow the audience to a specific group (e.g. 'first-time founders in year 1', 'beginners stuck at 500 followers').",
				);
				break;
			default:
				// Unknown signal — include it verbatim so Gemini still sees it.
				out.push(`Address the weakness: ${d}.`);
		}
	}
	return out;
}

/**
 * Local score check. Synthesises the post the way Analyze would see it
 * (`hook\ncaption`) and runs the same additive rubric. Returns both the
 * breakdown and the derived rewrite guidance so the retry path can reuse it.
 */
function scoreGenerated(cleaned: GenerateResponse): {
	breakdown: ScoreBreakdown;
	weaknesses: string[];
} {
	const fullPost = `${cleaned.recommendedHook}\n${cleaned.caption}`;
	const breakdown = computeAdditiveScore(fullPost, cleaned.recommendedHook, []);

	// Augment deductions with structural gaps the rubric doesn't already catch
	// (rubric deductions focus on language/CTA/emotion; "no number/timeframe"
	// shows up as a missing bonus rather than a deduction, so we check
	// explicitly and hint when absent).
	const weaknesses = weaknessesForDeductions(breakdown.deductions);
	const hasNumber = /\b\d+(?:\s*(?:%|k|kg|lbs|days|weeks|months|years|hours|minutes|seconds|followers|views|likes))?\b|\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(
		fullPost,
	);
	if (!hasNumber && breakdown.score < QUALITY_TARGET_SCORE) {
		weaknesses.push(
			"Add a concrete number or timeframe to the hook (e.g. '30 days', '80%', '5 mistakes', 'week 2').",
		);
	}
	return { breakdown, weaknesses };
}

type CleanedAttempt = {
	cleaned: GenerateResponse;
	breakdown: ScoreBreakdown;
	weaknesses: string[];
};

/**
 * Call Gemini with the given prompt + system instruction, then run the same
 * parse/clean/validate pipeline the handler used before this change. Returns
 * either a cleaned attempt + its local score, or `null` if the response was
 * invalid / the model errored. Caller handles fallback.
 */
async function runGeneratePipeline(
	prompt: string,
): Promise<CleanedAttempt | null> {
	let raw: unknown;
	try {
		raw = await generateJson(prompt, {
			systemInstruction: GENERATE_SYSTEM_CONTEXT,
		});
	} catch (error) {
		logger.warn({
			msg: "generate: gemini call failed (in pipeline)",
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}

	if (typeof raw !== "object" || raw === null) {
		logger.warn({ msg: "generate: non-object from model (in pipeline)", raw });
		return null;
	}

	const record = raw as Record<string, unknown>;
	const hooks = cleanHooks(record.hooks);
	const recommendedHook = pickRecommendedHook(hooks);
	const reasonMap = buildReasonMap(record.hooks, record.reasons);
	const cleaned = {
		hooks,
		recommendedHook,
		recommendedReason: reasonFor(recommendedHook, reasonMap),
		caption: cleanCaption(record.caption),
		hashtags: cleanHashtags(record.hashtags),
	};

	const parsed = generateResponseSchema.safeParse(cleaned);
	if (!parsed.success) {
		logger.warn({
			msg: "generate: cleaned output failed validation (in pipeline)",
			issues: parsed.error.issues,
		});
		return null;
	}

	const { breakdown, weaknesses } = scoreGenerated(parsed.data);
	return { cleaned: parsed.data, breakdown, weaknesses };
}

export const generateHandler: RouteHandler<typeof generateRoute, AppEnv> = async (
	c,
) => {
	const body = c.req.valid("json");
	const normalizedIdea = normalizeIdea(body.idea);
	const contentType: ContentType = body.contentType;
	const startedAt = Date.now();

	// Attempt #1 — same task prompt we've always used, now with a system
	// instruction that primes Gemini on the elite-threshold target.
	const firstPrompt = buildGeneratePrompt({
		idea: normalizedIdea,
		contentType,
	});
	const first = await runGeneratePipeline(firstPrompt);
	if (!first) {
		// Preserve the original error contract — 502 when the very first call
		// couldn't produce a valid shape. We don't retry on hard Gemini errors
		// because that usually means an outage, not a score miss.
		return c.json(
			{
				error: "generation_failed",
				message: "The model could not be reached or returned an unexpected response.",
			},
			502,
		);
	}

	// Happy path: first attempt cleared the bar → ship immediately.
	if (first.breakdown.score >= QUALITY_TARGET_SCORE) {
		logger.info({
			msg: "generate.quality: scored",
			contentType,
			attempt: 1,
			firstScore: first.breakdown.score,
			shipped: "first",
			latencyMs: Date.now() - startedAt,
			normalizedIdea,
			userId: c.get("userId"),
			userEmail: c.get("user")?.email,
		});
		return c.json(first.cleaned, 200);
	}

	// Attempt #1 scored below target — silent retry with targeted guidance.
	// Gemini sees the previous response + the specific weaknesses. If the
	// retry fails to produce valid output, we ship the first attempt rather
	// than erroring (don't punish the user for our retry plumbing).
	const correctorPrompt = buildGenerateCorrectorPrompt({
		idea: normalizedIdea,
		contentType,
		weaknesses: first.weaknesses,
	});
	const retry = await runGeneratePipeline(correctorPrompt);

	// Pick whichever attempt scored higher. Option A from the plan: no further
	// retries — even if the best we have is sub-85, ship it and log it.
	const chosen =
		retry && retry.breakdown.score > first.breakdown.score ? retry : first;
	const shippedLabel = chosen === first ? "first" : "retry";

	logger.info({
		msg: "generate.quality: scored",
		contentType,
		attempt: 2,
		firstScore: first.breakdown.score,
		retryScore: retry?.breakdown.score ?? null,
		shipped: shippedLabel,
		finalScore: chosen.breakdown.score,
		deductions: chosen.breakdown.deductions,
		subTarget: chosen.breakdown.score < QUALITY_TARGET_SCORE,
		latencyMs: Date.now() - startedAt,
		normalizedIdea,
		userId: c.get("userId"),
		userEmail: c.get("user")?.email,
	});

	return c.json(chosen.cleaned, 200);
};
