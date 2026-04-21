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
const MIN_SCENE_SEC = 4;
const MAX_SCENE_SEC = 6;
const MIN_VIDEO_SEC = 12;
const MAX_VIDEO_SEC = 20;
const BGM_VOLUME = 0.12;
// Crossfade duration between adjacent clips. Short enough to keep momentum,
// long enough to feel intentional. Total video length shrinks by
// (N-1) * XFADE_SEC — compose accounts for this.
const XFADE_SEC = 0.45;

export type ComposeInput = {
	videoId: string;
	outputPath: string;
	/** 2–3 images with their scene types — motion picked per scene for story arc */
	scenes: Array<{ url: string; sceneType?: SceneType }>;
	voiceMp3: Buffer; // TTS output
	bgmPath?: string | null; // absolute path to bgm mp3, or null
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

function pickSceneSeconds(totalSec: number, sceneCount: number): number {
	const equal = totalSec / sceneCount;
	return Math.min(MAX_SCENE_SEC, Math.max(MIN_SCENE_SEC, equal));
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
	// [0:v][1:v]xfade=fade:0.45:offset=<D-XFADE>[v01];
	// [v01][2:v]xfade=fade:0.45:offset=<2D-2*XFADE>[v012]; ...
	const filters: string[] = [];
	let prevLabel = "0:v";
	for (let i = 1; i < clipPaths.length; i++) {
		const offset = i * perSceneSec - i * XFADE_SEC;
		const isLast = i === clipPaths.length - 1;
		const outLabel = isLast ? "v" : `v${i}`;
		filters.push(
			`[${prevLabel}][${i}:v]xfade=transition=fade:duration=${XFADE_SEC}:offset=${offset.toFixed(3)}[${outLabel}]`,
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

async function mixAudio(
	voicePath: string,
	bgmPath: string | null | undefined,
	outPath: string,
	totalSec: number,
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
			`[0:a]apad[voice];[1:a]volume=${BGM_VOLUME}[bgm];[voice][bgm]amix=inputs=2:duration=first:dropout_transition=0[mix];[mix]atrim=0:${totalSec}[a]`,
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
	const { videoId, outputPath, scenes, voiceMp3, bgmPath } = input;
	const scratchDir = path.join(tmpdir(), `cav-${videoId}`);
	await mkdir(scratchDir, { recursive: true });

	try {
		// 1. Write voice MP3 + download images
		const voicePath = path.join(scratchDir, "voice.mp3");
		await writeFile(voicePath, voiceMp3);
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
		const voiceSec = Math.max(
			1,
			Math.min(MAX_VIDEO_SEC, rawVoiceSec || sceneCount * 4),
		);
		const perSceneFromVoice = pickSceneSeconds(voiceSec, sceneCount);
		const minSceneTotal = perSceneFromVoice * sceneCount;
		const rawTotal = Math.max(voiceSec, minSceneTotal);
		const targetTotal = Math.min(MAX_VIDEO_SEC, Math.max(MIN_VIDEO_SEC, rawTotal));
		// Bump perScene so the post-crossfade total matches the target.
		const fadeOverhead = (sceneCount - 1) * XFADE_SEC;
		const perScene = Math.max(
			MIN_SCENE_SEC,
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
			xfadeSec: XFADE_SEC,
			bgm: Boolean(bgmPath),
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
		await stitchClipsWithCrossfade(clipPaths, perScene, silentVideo);

		// 5. Mix voice + (optional) bgm → final audio track (padded to totalSec)
		const mixedAudio = path.join(scratchDir, "mixed.m4a");
		await mixAudio(voicePath, bgmPath, mixedAudio, totalSec);

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
