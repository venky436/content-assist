import type { RouteHandler } from "@hono/zod-openapi";
import {
	generateVideoResponseSchema,
	type VideoEnergy,
	type VideoTone,
	type VideoVoice,
} from "@content-assist/shared";
import { logger } from "@server/lib/logger";
import type { AppEnv } from "@server/middleware/auth.middleware";
import {
	ForbiddenCustomBgmError,
	resolveBgmPath,
	resolveCustomBgm,
	type ResolvedCustomBgm,
} from "@server/services/bgm";
import { FfmpegError } from "@server/services/ffmpeg";
import { storage, uploadFileToS3 } from "@server/services/storage";
import { TTSError, synthesizeSpeech } from "@server/services/tts";
import { reserveVideoPath } from "@server/services/video-storage";
import { composeVideo } from "@server/modules/video/video.compose";
import {
	buildVoiceoverSegments,
	composeNarrationViaGemini,
} from "@server/modules/video/video.prompt";
import {
	detectEnergy,
	profileFor,
	type EnergyProfile,
} from "@server/modules/video/video.energy";
import type { generateVideoRoute } from "@server/modules/video/video.schema";

/** Per-segment TTS speed — used ONLY for the `tts-1` fallback path. The
 *  expressive `gpt-4o-mini-tts` ignores these (see openai-tts.client.ts) and
 *  derives pacing from the delivery `instructions` prose instead. */
const HOOK_SPEED = 0.88;
const BODY_SPEED = 0.95;
const CTA_SPEED = 0.9;
const OVERRIDE_SPEED = 0.93;

/**
 * Default delivery prose for the caller-override path (when the user supplies
 * their own voiceover text — we bypass segmentation entirely, so the energy
 * profile doesn't apply).
 */
const OVERRIDE_INSTRUCTIONS =
	"Speak naturally and conversationally, like you're telling a friend a story. Vary your pace based on the content — slower on important words, lighter on asides. Take natural breaths. Unhurried.";

/**
 * Build a delivery direction for one body line based on its content AND the
 * resolved energy profile. Each line gets a pace (slow/medium/quick) + a mood
 * hint (thoughtful / warm / curious / soft) derived from length, punctuation,
 * and simple keyword signals. The energy profile shifts the pace decision:
 *   - `bodyPaceBias: "quick"`  → medium-length lines feel energetic
 *   - `bodyPaceBias: "slow"`   → medium-length lines feel deliberate
 *   - `bodyPaceBias: "neutral"` → current locked behaviour
 *
 * The profile's `bodyBaselineInstructions` is the shared voice-identity prose
 * — keeps the voice consistent across lines while only the pace + mood
 * phrase varies.
 */
function buildBodyLineInstructions(
	line: string,
	indexInBody: number,
	totalLines: number,
	profile: EnergyProfile,
): string {
	const text = line.trim();
	const wordCount = text.split(/\s+/).filter(Boolean).length;
	const endsWithQuestion = /\?\s*$/.test(text);
	const endsWithEllipsis = /…\s*$|\.\.\.\s*$/.test(text);
	const endsWithExclaim = /!\s*$/.test(text);
	const lower = text.toLowerCase();
	const isFirstLine = indexInBody === 0;
	const isLastLine = indexInBody === totalLines - 1;

	// Emotional-keyword signals — broad buckets, not exhaustive.
	const hasEmotiveWords = /(love|hurt|scared|lost|broke|regret|miss|dream|hope|proud|alone|finally|truth|real|changed|matters?|everything|nothing)/i.test(
		lower,
	);
	const hasUrgencyWords = /(now|stop|wait|listen|remember|quick|fast|don't|never)/i.test(
		lower,
	);

	// Pace decision tree — short lines move faster, long lines slower,
	// emotional lines pull toward slow regardless of length.
	let pace: "slow" | "medium" | "quick";
	if (hasEmotiveWords || endsWithEllipsis || wordCount >= 10) pace = "slow";
	else if (wordCount <= 5 || hasUrgencyWords || endsWithExclaim) pace = "quick";
	else pace = "medium";

	// Apply the energy-profile bias: exciting pushes medium → quick,
	// calm pushes medium → slow. Strongly-signalled lines (emotive → slow,
	// urgency/exclamation → quick) keep their decision regardless so content
	// always wins over the bucket hint for the extreme cases.
	if (profile.bodyPaceBias === "quick" && pace === "medium") pace = "quick";
	else if (profile.bodyPaceBias === "slow" && pace === "medium") pace = "slow";

	// Per-pace direction phrasing. Exciting mode amplifies the "quick" prose
	// so the model leans further into animated delivery.
	const paceDirection =
		pace === "slow"
			? "Slow down noticeably for this line — give each word weight, take a small breath at the end."
			: pace === "quick"
				? profile.bodyPaceBias === "quick"
					? "Pick up the pace with animated energy — quick, punchy, alive. Crisp enunciation, no dragging."
					: "Pick up the pace just slightly — energetic and punchy, but still conversational."
				: "Steady conversational pace. Natural rhythm, like you're thinking as you speak.";

	// Mood hints stack with pace — inflection cues only, don't dictate pace.
	const moodCues: string[] = [];
	if (endsWithQuestion) moodCues.push("End with a genuine rising inflection, curious not rhetorical.");
	if (endsWithEllipsis) moodCues.push("Trail off softly, like you're pausing to think.");
	if (hasEmotiveWords) moodCues.push("Let a little emotion land in your voice — warm, human, not performative.");
	if (isFirstLine) moodCues.push("You're picking up from the hook — carry that energy forward.");
	if (isLastLine) moodCues.push("This is the last body line before the CTA — settle into it a touch.");

	return [profile.bodyBaselineInstructions, paceDirection, ...moodCues].join(" ");
}

function publicVideoUrl(origin: string, videoId: string): string {
	// Trim trailing slash, then append.
	const base = origin.replace(/\/$/, "");
	return `${base}/videos/${videoId}.mp4`;
}

function makeVideoId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const generateVideoHandler: RouteHandler<typeof generateVideoRoute, AppEnv> = async (c) => {
	const body = c.req.valid("json");
	const startedAt = Date.now();
	const videoId = makeVideoId();
	const userId = c.get("userId");
	const tone: VideoTone = body.tone ?? "motivational";
	const wantsBgm = body.bgm !== false; // default true
	// VideoVoice is already the OpenAI TTS voice ID (alloy/echo/fable/onyx/nova/shimmer);
	// default to `nova` — bright + female-sounding, our prior default.
	const openaiVoice: VideoVoice = body.voice ?? "nova";
	// Energy: user-provided → auto-detect fallback → resolve the pacing profile.
	// When the detector is unsure it returns "balanced", which is the current
	// locked flow — byte-identical to before this signal existed.
	const energy: VideoEnergy =
		body.energy ?? detectEnergy({ idea: body.idea, caption: body.caption, hook: body.hook });
	const pacingProfile = profileFor(energy);
	logger.info({
		msg: "video.pacing: resolved",
		videoId,
		energy,
		source: body.energy ? "request" : "detected",
	});

	// 1. Build voiceover content.
	//
	// Two paths:
	//   - Caller override (body.voiceover): single TTS at 0.93x, no segmentation
	//     → preserves "I'll write my own voiceover" without changing behaviour.
	//   - Default: segment into hook / body / cta and render each at its own
	//     speed in parallel → stitched with silence gaps for natural pacing.
	const hasOverride =
		typeof body.voiceover === "string" && body.voiceover.trim().length > 0;

	let voiceTrack:
		| { kind: "single"; mp3: Buffer }
		| {
				kind: "segmented";
				segments: { hook: Buffer; bodyLines: Buffer[]; cta: Buffer };
			};
	let voiceoverText: string;

	try {
		if (hasOverride) {
			const overrideText = (body.voiceover as string).trim().slice(0, 800);
			voiceoverText = overrideText;
			const mp3 = await synthesizeSpeech(overrideText, {
				voice: openaiVoice,
				speed: OVERRIDE_SPEED,
				instructions: OVERRIDE_INSTRUCTIONS,
			});
			voiceTrack = { kind: "single", mp3 };
		} else {
			// Prefer Gemini-composed narration (hook + natural body + CTA).
			// Fall back to the programmatic heuristic if Gemini times out,
			// returns malformed JSON, or violates the hook-first rule.
			let segments = await composeNarrationViaGemini({
				idea: body.idea,
				caption: body.caption,
				hook: body.hook,
			});
			if (!segments) {
				logger.info({ msg: "narration: using heuristic fallback", videoId });
				segments = buildVoiceoverSegments({
					idea: body.idea,
					caption: body.caption,
					hook: body.hook,
				});
			} else {
				logger.info({
					msg: "narration: gemini success",
					videoId,
					hookChars: segments.hook.length,
					bodyLineCount: segments.bodyLines.length,
					bodyChars: segments.bodyLines.reduce((s, l) => s + l.length, 0),
					ctaChars: segments.cta.length,
				});
			}
			voiceoverText = [segments.hook, ...segments.bodyLines, segments.cta]
				.join(" ")
				.slice(0, 800);
			// Render hook + every body line + CTA in parallel. Per-line body TTS
			// is what gives the delivery natural breaths between thoughts — and
			// each body line carries its own delivery direction tuned to the
			// line's length, punctuation, and emotional charge so the voice
			// actually varies pace between neighbouring thoughts (slow on
			// reflective ones, quick on punchy ones, rising on questions).
			//
			// `speed` is only honoured by the `tts-1` fallback path (see TTS
			// client). The expressive model takes pacing from `instructions`.
			const [hookMp3, bodyLineMp3s, ctaMp3] = await Promise.all([
				synthesizeSpeech(segments.hook, {
					voice: openaiVoice,
					speed: HOOK_SPEED,
					instructions: pacingProfile.hookInstructions,
				}),
				Promise.all(
					segments.bodyLines.map((line, i) =>
						synthesizeSpeech(line, {
							voice: openaiVoice,
							speed: BODY_SPEED,
							instructions: buildBodyLineInstructions(
								line,
								i,
								segments.bodyLines.length,
								pacingProfile,
							),
						}),
					),
				),
				synthesizeSpeech(segments.cta, {
					voice: openaiVoice,
					speed: CTA_SPEED,
					instructions: pacingProfile.ctaInstructions,
				}),
			]);
			voiceTrack = {
				kind: "segmented",
				segments: { hook: hookMp3, bodyLines: bodyLineMp3s, cta: ctaMp3 },
			};
		}
	} catch (err) {
		const code =
			err instanceof TTSError && err.code === "not_configured"
				? "tts_not_configured"
				: err instanceof TTSError && err.code === "timeout"
					? "timeout"
					: "tts_failed";
		logger.error({
			msg: "video: tts failed",
			code,
			error: err instanceof Error ? err.message : String(err),
		});
		const message =
			code === "tts_not_configured"
				? "Voiceover is not configured. Add OPENAI_API_KEY to the server .env and restart."
				: code === "timeout"
					? "Voiceover took too long. Try again."
					: "Voiceover failed. Try again.";
		return c.json({ error: code, message }, 502);
	}

	// 3. Resolve BGM.
	//    Priority:
	//      bgm=false              → no BGM
	//      bgm=true + bgmKey      → user-uploaded audio (download + ownership-checked)
	//      bgm=true + no bgmKey   → tone-based preset
	// On a bad bgmKey we 403 up-front rather than silently dropping to preset —
	// the client expects "my track" to either play or explain why.
	let bgmPath: string | null = null;
	let customBgm: ResolvedCustomBgm | null = null;
	let bgmKeyUsed: string | undefined;
	if (wantsBgm && body.bgmKey) {
		try {
			customBgm = await resolveCustomBgm(body.bgmKey, userId);
			bgmPath = customBgm.path;
			bgmKeyUsed = body.bgmKey;
		} catch (err) {
			if (err instanceof ForbiddenCustomBgmError) {
				return c.json(
					{ error: "media_forbidden", message: err.message },
					403,
				);
			}
			logger.warn({
				msg: "video: custom bgm download failed, falling back to preset",
				error: err instanceof Error ? err.message : String(err),
			});
			bgmPath = resolveBgmPath(tone);
		}
	} else if (wantsBgm) {
		bgmPath = resolveBgmPath(tone);
	}

	// 4. Compose via FFmpeg
	const outputPath = await reserveVideoPath(videoId);
	let result: Awaited<ReturnType<typeof composeVideo>>;
	try {
		result = await composeVideo({
			videoId,
			outputPath,
			scenes: body.images.map((i) => ({ url: i.url, sceneType: i.sceneType })),
			voice: voiceTrack,
			bgmPath,
			pacing: {
				gapHookBody: pacingProfile.gapHookBody,
				gapBodyLine: pacingProfile.gapBodyLine,
				gapBodyCta: pacingProfile.gapBodyCta,
				sceneMinSec: pacingProfile.sceneMinSec,
				sceneMaxSec: pacingProfile.sceneMaxSec,
				xfadeSec: pacingProfile.xfadeSec,
			},
		});
	} catch (err) {
		const ffmpegCode = err instanceof FfmpegError ? err.code : undefined;
		const code =
			ffmpegCode === "not_installed"
				? "ffmpeg_not_installed"
				: ffmpegCode === "timeout"
					? "timeout"
					: "composition_failed";
		logger.error({
			msg: "video: compose failed",
			code,
			error: err instanceof Error ? err.message : String(err),
			stderr: err instanceof FfmpegError ? err.stderr : undefined,
		});
		const message =
			code === "ffmpeg_not_installed"
				? "FFmpeg is not installed on the server. Install it (e.g. `brew install ffmpeg`) and restart."
				: code === "timeout"
					? "Video took too long to render. Try again."
					: "Couldn't compose the video. Try again.";
		return c.json({ error: code, message }, 502);
	} finally {
		// Delete the downloaded custom BGM tmp file regardless of compose outcome.
		if (customBgm) await customBgm.cleanup();
	}

	// 5. Mirror the composed MP4 into S3 for a durable URL. Fall back to the
	//    local `/videos/:id.mp4` route (existing TTL-swept tmp dir) if the
	//    upload fails — the video still plays for the next hour that way.
	const origin = new URL(c.req.url).origin;
	const localUrl = publicVideoUrl(origin, videoId);
	const objectKey = storage.buildKey({
		prefix: "generated-videos",
		userId,
		ext: "mp4",
	});

	let videoUrl = localUrl;
	let videoKey: string | undefined;
	try {
		await uploadFileToS3(outputPath, objectKey, "video/mp4");
		// 2h presigned GET — videos get replayed more than images.
		const signed = await storage.presignGet({ key: objectKey, ttlSec: 60 * 60 * 2 });
		videoUrl = signed.url;
		videoKey = objectKey;
	} catch (err) {
		logger.warn({
			msg: "video: S3 upload failed, falling back to local /videos/* URL",
			videoId,
			error: err instanceof Error ? err.message : String(err),
		});
	}

	const response = {
		videoUrl,
		videoKey,
		voiceover: voiceoverText,
		durationMs: result.durationMs,
		tone,
		bgmUsed: result.bgmUsed,
		bgmKey: bgmKeyUsed,
		voice: openaiVoice,
		energy,
	};

	const parsed = generateVideoResponseSchema.safeParse(response);
	if (!parsed.success) {
		logger.error({
			msg: "video: response schema mismatch",
			issues: parsed.error.issues,
		});
		return c.json(
			{ error: "composition_failed", message: "Unexpected response shape." },
			502,
		);
	}

	logger.info({
		msg: "video: success",
		videoId,
		imageCount: body.images.length,
		durationMs: result.durationMs,
		bgmUsed: result.bgmUsed,
		tone,
		voice: openaiVoice,
		voiceKind: voiceTrack.kind,
		latencyMs: Date.now() - startedAt,
		userId: c.get("userId"),
		userEmail: c.get("user")?.email,
	});

	return c.json(parsed.data, 200);
};
