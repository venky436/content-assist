import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SceneType } from "@content-assist/shared";
import { runFfmpeg, probeAudioDuration } from "@server/services/ffmpeg";
import { logger } from "@server/lib/logger";

/**
 * Compose a short vertical reel (1080x1920) from a list of image URLs,
 * a voiceover MP3 (required), and an optional BGM MP3.
 *
 * Pipeline:
 *   1. Download every image to a scratch dir.
 *   2. Probe the voiceover for its real duration → each scene gets an
 *      equal slice (clamped to 3–5s per image).
 *   3. For each image, render a Ken-Burns-style MP4 clip using `zoompan`.
 *   4. Concat the clips into a silent video.
 *   5. Mix the voice track (1.0 volume) with looped BGM (0.12 volume if provided).
 *   6. Mux the mixed audio onto the silent video, trimming to voice length.
 *
 * Notes
 * - 1080x1920 matches Instagram Reels / TikTok aspect.
 * - Max voice length clamped to 20s on the callsite so videos stay short.
 * - If BGM is not provided, we still produce a valid file with voice-only audio.
 */

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
// Widened from 4–6s so the per-scene duration scales naturally with the
// image count. With 2 images and a 20s voice each scene runs ~10s (slow,
// breathing). With 6 images and the same voice each scene runs ~3.3s
// (fast, punchy). `pickSceneSeconds` divides the voice evenly — these
// bounds just keep extreme cases from feeling sluggish or machine-gun.
const MIN_SCENE_SEC = 2.5;
const MAX_SCENE_SEC = 10;
const MIN_VIDEO_SEC = 12;
const MAX_VIDEO_SEC = 30;
/** Trailing silence added to totalSec so the last consonant never gets clipped. */
const TAIL_BUFFER_SEC = 0.4;
const BGM_VOLUME = 0.12;
/** Ducked BGM volume under the CTA — drops so the closing ask is clear. */
const BGM_DUCK_VOLUME = 0.06;
// Crossfade duration between adjacent clips. Short enough to keep momentum,
// long enough to feel intentional. Total video length shrinks by
// (N-1) * XFADE_SEC — compose accounts for this.
const XFADE_SEC = 0.45;
/** Gap between hook → body; feels like a breath. */
const GAP_HOOK_BODY_SEC = 0.3;
/** Gap between consecutive body lines — the micro-breath that makes the
 *  delivery feel lived-in rather than recited. */
const GAP_BODY_LINE_SEC = 0.22;
/** Gap before CTA; deliberate pause before the ask. */
const GAP_BODY_CTA_SEC = 0.35;

export type VoiceSegmentsInput = {
	hook: Buffer;
	/** One buffer per spoken line. A 220ms silence is inserted between each. */
	bodyLines: Buffer[];
	cta: Buffer;
};

/**
 * Optional pacing override — when present, these values replace the module-
 * level defaults for silence gaps, per-scene duration bounds, and crossfade.
 * Energy-aware callers (video.handler.ts) derive this from the resolved
 * `EnergyProfile`. Callers that don't set it get the balanced/default flow,
 * byte-identical to the pre-energy pipeline.
 */
export type ComposePacing = {
	gapHookBody: number;
	gapBodyLine: number;
	gapBodyCta: number;
	sceneMinSec: number;
	sceneMaxSec: number;
	xfadeSec: number;
};

export type ComposeInput = {
	videoId: string;
	outputPath: string;
	/** 2–3 images with their scene types — motion picked per scene for story arc */
	scenes: Array<{ url: string; sceneType?: SceneType }>;
	/**
	 * Either 3 segment buffers for natural pacing (hook/body/cta rendered
	 * separately at different speeds) OR a single buffer for the legacy /
	 * voiceover-override path. Caller picks.
	 */
	voice: { kind: "segmented"; segments: VoiceSegmentsInput } | { kind: "single"; mp3: Buffer };
	bgmPath?: string | null; // absolute path to bgm mp3, or null
	pacing?: ComposePacing;
};

export type ComposeResult = {
	durationMs: number;
	bgmUsed: boolean;
};

async function downloadImage(url: string, dest: string): Promise<void> {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`image download failed (${res.status}) for ${url}`);
	}
	const buf = Buffer.from(await res.arrayBuffer());
	await writeFile(dest, buf);
}

function pickSceneSeconds(
	totalSec: number,
	sceneCount: number,
	minSec = MIN_SCENE_SEC,
	maxSec = MAX_SCENE_SEC,
): number {
	const equal = totalSec / sceneCount;
	return Math.min(maxSec, Math.max(minSec, equal));
}

/**
 * Motion style per scene. Tied to sceneType so the arc reads as a story:
 *   struggle → punch-in  (snap-in entrance, hits hard)
 *   decision → dolly     (cinematic push with diagonal drift)
 *   result   → pan-up    (upward reveal = release)
 * Scenes without a known sceneType fall back to gentle L/R pans so legacy
 * posts and user-provided images still get life without defaulting twice.
 */
type Motion =
	| "punch-in"
	| "dolly"
	| "pan-up"
	| "zoom-in"
	| "zoom-out"
	| "static"
	| "pan-right"
	| "pan-left";

function motionForScene(sceneType: SceneType | undefined, index: number): Motion {
	if (sceneType === "struggle") return "punch-in";
	if (sceneType === "decision") return "dolly";
	if (sceneType === "result") return "pan-up";
	// No scene type — cycle between pan directions for variety.
	return index % 2 === 0 ? "pan-right" : "pan-left";
}

async function renderClip(input: {
	imagePath: string;
	outPath: string;
	durationSec: number;
	motion: Motion;
}): Promise<void> {
	const { imagePath, outPath, durationSec, motion } = input;
	const totalFrames = Math.max(1, Math.round(durationSec * FPS));

	// Gentle motion: max zoom ~1.08 (was 1.15). Slow, continuous, no jitter.
	// zoompan's `zoom` is the current zoom level; `on` is the frame index.
	let zoomExpr: string;
	let xExpr: string;
	let yExpr: string;

	// Punch-in "snap" window: the first 15% of the clip does the zoom-out
	// from 1.15 → 1.0, then the rest holds at 1.0. Creates a hard entrance
	// impact without feeling jerky. Baked at build-time so zoompan's
	// expression parser can consume a plain numeric frame count.
	const punchEnd = Math.max(1, Math.round(totalFrames * 0.18));

	switch (motion) {
		case "punch-in":
			// Start overscaled, snap to 1.0 early, then settle — a classic
			// "hit" that the eye reads as "this just happened".
			zoomExpr = `if(lt(on,${punchEnd}),1.15-(on/${punchEnd})*0.15,1.0)`;
			xExpr = `iw/2-(iw/zoom/2)`;
			yExpr = `ih/2-(ih/zoom/2)`;
			break;
		case "dolly":
			// Cinematic push: gentle zoom + subtle diagonal drift. Reads like a
			// handheld dolly move — motion that feels human rather than
			// mechanically zoomed. Cap zoom at 1.07 so it stays restrained.
			zoomExpr = `min(1.0+(on/${totalFrames})*0.07,1.07)`;
			xExpr = `iw/2-(iw/zoom/2) + (on/${totalFrames})*(iw*0.018)`;
			yExpr = `ih/2-(ih/zoom/2) - (on/${totalFrames})*(ih*0.012)`;
			break;
		case "pan-up":
			// Hold zoom steady, slide the crop window UP (y decreases over time).
			// Gives the release/reveal feel — eyes naturally travel upward.
			zoomExpr = `1.08`;
			xExpr = `iw/2-(iw/zoom/2)`;
			yExpr = `ih/2-(ih/zoom/2) - (on/${totalFrames})*(ih*0.05)`;
			break;
		case "zoom-in":
			zoomExpr = `min(1.0+(on/${totalFrames})*0.08,1.08)`;
			xExpr = `iw/2-(iw/zoom/2)`;
			yExpr = `ih/2-(ih/zoom/2)`;
			break;
		case "zoom-out":
			zoomExpr = `max(1.08-(on/${totalFrames})*0.08,1.0)`;
			xExpr = `iw/2-(iw/zoom/2)`;
			yExpr = `ih/2-(ih/zoom/2)`;
			break;
		case "pan-right":
			// Hold zoom constant, slide crop window right by a small amount.
			zoomExpr = `1.06`;
			xExpr = `iw/2-(iw/zoom/2) + (on/${totalFrames})*(iw*0.04)`;
			yExpr = `ih/2-(ih/zoom/2)`;
			break;
		case "pan-left":
			zoomExpr = `1.06`;
			xExpr = `iw/2-(iw/zoom/2) - (on/${totalFrames})*(iw*0.04)`;
			yExpr = `ih/2-(ih/zoom/2)`;
			break;
		case "static":
		default:
			// Fixed-frame with a barely-perceptible breathing zoom (1.02 → 1.04).
			// Gives the shot life without pulling attention.
			zoomExpr = `1.02+(on/${totalFrames})*0.02`;
			xExpr = `iw/2-(iw/zoom/2)`;
			yExpr = `ih/2-(ih/zoom/2)`;
			break;
	}

	const filter = [
		// Scale + crop to a wider working canvas so zoompan has headroom for pans.
		`scale=${WIDTH * 2}:${HEIGHT * 2}:force_original_aspect_ratio=increase`,
		`crop=${WIDTH * 2}:${HEIGHT * 2}`,
		`zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=${totalFrames}:s=${WIDTH}x${HEIGHT}:fps=${FPS}`,
		`format=yuv420p`,
	].join(",");

	await runFfmpeg(
		[
			"-y",
			"-loop",
			"1",
			"-i",
			imagePath,
			"-t",
			String(durationSec),
			"-vf",
			filter,
			"-c:v",
			"libx264",
			"-preset",
			"veryfast",
			"-crf",
			"22",
			"-pix_fmt",
			"yuv420p",
			"-r",
			String(FPS),
			"-an",
			outPath,
		],
		{ timeoutMs: 60_000 },
	);
}

/**
 * Stitch clips together with xfade crossfades.
 *
 * For clips of duration D (all equal per current compose plan), xfade offsets
 * are cumulative minus the overlap from previous fades:
 *   offset_i = i*D - i*XFADE   for i = 1..N-1
 *
 * Total output duration = sum(Di) - (N-1) * XFADE.
 *
 * Single-clip case short-circuits to a plain copy.
 */
async function stitchClipsWithCrossfade(
	clipPaths: string[],
	perSceneSec: number,
	outPath: string,
	xfadeSec: number = XFADE_SEC,
): Promise<void> {
	if (clipPaths.length === 0) {
		throw new Error("stitch: no clips to stitch");
	}
	if (clipPaths.length === 1) {
		// Single clip — just copy.
		await runFfmpeg(
			["-y", "-i", clipPaths[0]!, "-c:v", "copy", "-an", outPath],
			{ timeoutMs: 30_000 },
		);
		return;
	}

	const args: string[] = ["-y"];
	for (const clip of clipPaths) {
		args.push("-i", clip);
	}

	// Build the xfade chain.
	// [0:v][1:v]xfade=fade:<xfadeSec>:offset=<D-XFADE>[v01];
	// [v01][2:v]xfade=fade:<xfadeSec>:offset=<2D-2*XFADE>[v012]; ...
	const filters: string[] = [];
	let prevLabel = "0:v";
	for (let i = 1; i < clipPaths.length; i++) {
		const offset = i * perSceneSec - i * xfadeSec;
		const isLast = i === clipPaths.length - 1;
		const outLabel = isLast ? "v" : `v${i}`;
		filters.push(
			`[${prevLabel}][${i}:v]xfade=transition=fade:duration=${xfadeSec}:offset=${offset.toFixed(3)}[${outLabel}]`,
		);
		prevLabel = outLabel;
	}

	args.push(
		"-filter_complex",
		filters.join(";"),
		"-map",
		"[v]",
		"-c:v",
		"libx264",
		"-preset",
		"veryfast",
		"-crf",
		"22",
		"-pix_fmt",
		"yuv420p",
		"-r",
		String(FPS),
		"-an",
		outPath,
	);
	await runFfmpeg(args, { timeoutMs: 90_000 });
}

/**
 * Stitch voice segments into one track with natural silence gaps — hook,
 * then each body line with a breath between them, then CTA. Returns the
 * stitched path + where the CTA starts (for BGM ducking).
 *
 * The ffmpeg graph is built dynamically so 1…N body lines work identically:
 *   hook → (GAP_HOOK_BODY) → bodyLine[0] → (GAP_BODY_LINE) → bodyLine[1] …
 *        → (GAP_BODY_CTA) → cta
 */
async function stitchVoiceSegments(
	segments: VoiceSegmentsInput,
	scratchDir: string,
	gaps: {
		gapHookBody?: number;
		gapBodyLine?: number;
		gapBodyCta?: number;
	} = {},
): Promise<{ voicePath: string; ctaStartSec: number }> {
	const GAP_HB = gaps.gapHookBody ?? GAP_HOOK_BODY_SEC;
	const GAP_BL = gaps.gapBodyLine ?? GAP_BODY_LINE_SEC;
	const GAP_BC = gaps.gapBodyCta ?? GAP_BODY_CTA_SEC;
	if (segments.bodyLines.length === 0) {
		throw new Error("stitchVoiceSegments: bodyLines is empty");
	}

	// 1. Write every audio buffer to disk so ffmpeg can read them as inputs.
	const hookPath = path.join(scratchDir, "voice-hook.mp3");
	const ctaPath = path.join(scratchDir, "voice-cta.mp3");
	await writeFile(hookPath, segments.hook);
	await writeFile(ctaPath, segments.cta);
	const bodyPaths: string[] = [];
	for (let i = 0; i < segments.bodyLines.length; i++) {
		const p = path.join(scratchDir, `voice-body-${i}.mp3`);
		await writeFile(p, segments.bodyLines[i]!);
		bodyPaths.push(p);
	}

	const outPath = path.join(scratchDir, "voice.mp3");

	// 2. Build the inputs array dynamically.
	//    Audio inputs: [hook, ...bodyLines, cta]
	//    Then: [hookBodyGap, interLineGap(s), bodyCtaGap] as lavfi silences.
	const interLineGapCount = Math.max(0, bodyPaths.length - 1);
	const inputs: string[] = [];
	inputs.push("-i", hookPath);
	for (const bp of bodyPaths) inputs.push("-i", bp);
	inputs.push("-i", ctaPath);
	// Gap inputs — same format for all, different durations.
	const gapDurations: number[] = [
		GAP_HB,
		...Array(interLineGapCount).fill(GAP_BL),
		GAP_BC,
	];
	for (const g of gapDurations) {
		inputs.push("-f", "lavfi", "-t", String(g), "-i", "anullsrc=r=44100:cl=mono");
	}

	// 3. Build the concat filter. Indices:
	//    audio:  0=hook, 1..N=bodyLines, N+1=cta
	//    gaps:   N+2=hook→body, N+3..N+3+(interLineGapCount-1)=interline, last=body→cta
	const audioCount = 1 + bodyPaths.length + 1; // hook + bodies + cta
	const hookIdx = 0;
	const firstBodyIdx = 1;
	const ctaIdx = 1 + bodyPaths.length;
	const firstGapIdx = audioCount;
	const hookBodyGapIdx = firstGapIdx; // gap[0]
	const interLineGapStart = firstGapIdx + 1; // gap[1..interLineGapCount]
	const bodyCtaGapIdx = firstGapIdx + 1 + interLineGapCount; // gap[last]

	// Pre-normalize every input (voice + silence) to matching sample rate,
	// format, and channel layout. This is what eliminates the click/pop/warble
	// artifacts that show up at segment boundaries when MP3s decoded from
	// different TTS calls come in with slightly different framing.
	//
	// Concat requires all inputs to share format; aformat forces that before
	// the concat node sees them.
	const totalInputs = audioCount + gapDurations.length;
	const normFilters: string[] = [];
	for (let i = 0; i < totalInputs; i++) {
		normFilters.push(
			`[${i}:a]aformat=sample_rates=44100:sample_fmts=s16:channel_layouts=mono[a${i}]`,
		);
	}

	const sequence: string[] = [];
	sequence.push(`[a${hookIdx}]`);
	sequence.push(`[a${hookBodyGapIdx}]`);
	for (let i = 0; i < bodyPaths.length; i++) {
		sequence.push(`[a${firstBodyIdx + i}]`);
		if (i < bodyPaths.length - 1) {
			sequence.push(`[a${interLineGapStart + i}]`);
		}
	}
	sequence.push(`[a${bodyCtaGapIdx}]`);
	sequence.push(`[a${ctaIdx}]`);

	const concatN = sequence.length;
	// Concat → soft high-pass (remove sub-rumble) → tiny DC offset fix. The
	// `asetnsamples` normalises frame sizes for the MP3 encoder so boundary
	// transients don't get clipped into a click.
	const concatFilter = `${sequence.join("")}concat=n=${concatN}:v=0:a=1,aresample=44100:async=1:first_pts=0,asetnsamples=n=1024[a]`;
	const filter = [...normFilters, concatFilter].join(";");

	await runFfmpeg(
		[
			"-y",
			...inputs,
			"-filter_complex",
			filter,
			"-map",
			"[a]",
			"-c:a",
			"libmp3lame",
			"-b:a",
			"128k",
			outPath,
		],
		{ timeoutMs: 30_000 },
	);

	// 4. Compute where the CTA starts so BGM can duck under it. Sum
	//    durations of hook + all body segments + all gaps before the CTA.
	const hookSec = await probeAudioDuration(hookPath);
	let bodyTotalSec = 0;
	for (const bp of bodyPaths) bodyTotalSec += await probeAudioDuration(bp);
	const interLineGapTotal = interLineGapCount * GAP_BL;
	const ctaStartSec =
		hookSec + GAP_HB + bodyTotalSec + interLineGapTotal + GAP_BC;

	return { voicePath: outPath, ctaStartSec };
}

async function mixAudio(
	voicePath: string,
	bgmPath: string | null | undefined,
	outPath: string,
	totalSec: number,
	/** When set, BGM volume drops to `BGM_DUCK_VOLUME` from this time onward. */
	ctaStartSec?: number,
): Promise<void> {
	if (!bgmPath) {
		// Voice only. Pad with silence using `apad` so the audio fills the full
		// video length (otherwise `-shortest` at the mux step truncates the video
		// to voice length, cutting off later scenes).
		await runFfmpeg(
			[
				"-y",
				"-i",
				voicePath,
				"-af",
				`apad,atrim=0:${totalSec}`,
				"-c:a",
				"aac",
				"-b:a",
				"128k",
				outPath,
			],
			{ timeoutMs: 30_000 },
		);
		return;
	}

	// BGM volume expression: constant 0.12 unless we have a CTA start, in which
	// case step down to 0.06 when `t` passes that point. `eval=frame` makes
	// ffmpeg re-evaluate the expression per frame (required for time-varying).
	const bgmVolumeExpr =
		typeof ctaStartSec === "number" && ctaStartSec > 0
			? `volume='if(gt(t,${ctaStartSec.toFixed(2)}),${BGM_DUCK_VOLUME},${BGM_VOLUME})':eval=frame`
			: `volume=${BGM_VOLUME}`;

	// Loop BGM to cover the full totalSec; mix with voice at low volume.
	// Voice is padded with silence (apad) so BGM carries the tail cleanly.
	await runFfmpeg(
		[
			"-y",
			"-i",
			voicePath,
			"-stream_loop",
			"-1",
			"-i",
			bgmPath,
			"-filter_complex",
			`[0:a]apad[voice];[1:a]${bgmVolumeExpr}[bgm];[voice][bgm]amix=inputs=2:duration=first:dropout_transition=0[mix];[mix]atrim=0:${totalSec}[a]`,
			"-map",
			"[a]",
			"-c:a",
			"aac",
			"-b:a",
			"128k",
			outPath,
		],
		{ timeoutMs: 30_000 },
	);
}

async function muxVideoAndAudio(
	videoPath: string,
	audioPath: string,
	outPath: string,
	durationSec: number,
): Promise<void> {
	await runFfmpeg(
		[
			"-y",
			"-i",
			videoPath,
			"-i",
			audioPath,
			"-c:v",
			"copy",
			"-c:a",
			"copy",
			"-map",
			"0:v:0",
			"-map",
			"1:a:0",
			"-shortest",
			"-t",
			String(durationSec),
			"-movflags",
			"+faststart",
			outPath,
		],
		{ timeoutMs: 30_000 },
	);
}

export async function composeVideo(input: ComposeInput): Promise<ComposeResult> {
	const { videoId, outputPath, scenes, voice, bgmPath, pacing } = input;
	const scratchDir = path.join(tmpdir(), `cav-${videoId}`);
	await mkdir(scratchDir, { recursive: true });

	// Resolve pacing knobs: each defaults to the module-level constant so
	// callers without a `pacing` override get the current locked flow
	// byte-identical.
	const sceneMinSec = pacing?.sceneMinSec ?? MIN_SCENE_SEC;
	const sceneMaxSec = pacing?.sceneMaxSec ?? MAX_SCENE_SEC;
	const xfadeSec = pacing?.xfadeSec ?? XFADE_SEC;

	try {
		// 1. Resolve the voice track.
		//    - "segmented" = 3 MP3s → stitch with silence gaps → natural pacing.
		//    - "single"    = 1 MP3  → write it and proceed (caller voiceover override).
		let voicePath: string;
		let ctaStartSec: number | undefined;
		if (voice.kind === "segmented") {
			const stitched = await stitchVoiceSegments(voice.segments, scratchDir, {
				gapHookBody: pacing?.gapHookBody,
				gapBodyLine: pacing?.gapBodyLine,
				gapBodyCta: pacing?.gapBodyCta,
			});
			voicePath = stitched.voicePath;
			ctaStartSec = stitched.ctaStartSec;
		} else {
			voicePath = path.join(scratchDir, "voice.mp3");
			await writeFile(voicePath, voice.mp3);
			ctaStartSec = undefined;
		}
		// 1b. Download images in parallel — they're independent.
		const imagePaths: string[] = [];
		for (let i = 0; i < scenes.length; i++) {
			const dest = path.join(scratchDir, `image-${i}.jpg`);
			await downloadImage(scenes[i]!.url, dest);
			imagePaths.push(dest);
		}

		// 2. Determine scene length + total video duration.
		// Crossfades overlap adjacent clips by XFADE_SEC, so the final video length
		// after stitching = N * perScene - (N-1) * XFADE_SEC.
		// To hit a target total `T`, set perScene = (T + (N-1)*XFADE_SEC) / N.
		const rawVoiceSec = await probeAudioDuration(voicePath);
		const sceneCount = imagePaths.length;
		// Reserve TAIL_BUFFER_SEC inside the MAX cap for trailing silence so
		// even a voice that runs right up to the cap keeps its final word.
		const voiceBudget = Math.max(1, MAX_VIDEO_SEC - TAIL_BUFFER_SEC);
		const voiceSec = Math.max(
			1,
			Math.min(voiceBudget, rawVoiceSec || sceneCount * 4),
		);
		const perSceneFromVoice = pickSceneSeconds(
			voiceSec,
			sceneCount,
			sceneMinSec,
			sceneMaxSec,
		);
		const minSceneTotal = perSceneFromVoice * sceneCount;
		const rawTotal = Math.max(voiceSec + TAIL_BUFFER_SEC, minSceneTotal);
		const targetTotal = Math.min(MAX_VIDEO_SEC, Math.max(MIN_VIDEO_SEC, rawTotal));
		// Bump perScene so the post-crossfade total matches the target.
		const fadeOverhead = (sceneCount - 1) * xfadeSec;
		const perScene = Math.max(
			sceneMinSec,
			(targetTotal + fadeOverhead) / sceneCount,
		);
		const totalSec = perScene * sceneCount - fadeOverhead;

		logger.info({
			msg: "video.compose: plan",
			videoId,
			imageCount: sceneCount,
			voiceSec: rawVoiceSec,
			perScene: Number(perScene.toFixed(2)),
			totalSec: Number(totalSec.toFixed(2)),
			xfadeSec,
			sceneMinSec,
			sceneMaxSec,
			bgm: Boolean(bgmPath),
			voiceKind: voice.kind,
			ctaStartSec:
				typeof ctaStartSec === "number" ? Number(ctaStartSec.toFixed(2)) : null,
		});

		// 3. Render each scene with motion picked from its sceneType.
		const clipPaths: string[] = [];
		for (let i = 0; i < imagePaths.length; i++) {
			const clipOut = path.join(scratchDir, `clip-${i}.mp4`);
			const motion = motionForScene(scenes[i]?.sceneType, i);
			await renderClip({
				imagePath: imagePaths[i]!,
				outPath: clipOut,
				durationSec: perScene,
				motion,
			});
			clipPaths.push(clipOut);
		}

		// 4. Stitch with xfade crossfades → silent video
		const silentVideo = path.join(scratchDir, "silent.mp4");
		await stitchClipsWithCrossfade(clipPaths, perScene, silentVideo, xfadeSec);

		// 5. Mix voice + (optional) bgm → final audio track (padded to totalSec).
		// Pass ctaStartSec so BGM ducks to a lower volume under the CTA segment.
		const mixedAudio = path.join(scratchDir, "mixed.m4a");
		await mixAudio(voicePath, bgmPath, mixedAudio, totalSec, ctaStartSec);

		// 6. Mux silent video with mixed audio → final mp4
		await muxVideoAndAudio(silentVideo, mixedAudio, outputPath, totalSec);

		return {
			durationMs: Math.round(totalSec * 1000),
			bgmUsed: Boolean(bgmPath),
		};
	} finally {
		// Best-effort scratch cleanup
		try {
			await rm(scratchDir, { recursive: true, force: true });
		} catch {}
	}
}
