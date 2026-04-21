import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { VideoTone } from "@content-assist/shared";
import { logger } from "@server/lib/logger";

const BGM_FILES: Record<VideoTone, string> = {
	motivational: "motivational.mp3",
	calm: "calm.mp3",
	emotional: "emotional.mp3",
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// services/bgm/ → ../../assets/bgm/
const BGM_DIR = path.resolve(__dirname, "..", "..", "assets", "bgm");

/**
 * Resolve the BGM file for a given tone.
 *
 * Resolution order:
 *   1. Tone-matched filename (motivational.mp3 / calm.mp3 / emotional.mp3).
 *   2. First MP3 in the folder, alphabetically — so a user who drops
 *      music-1.mp3 + music-2.mp3 still gets BGM without renaming.
 *   3. null → pipeline gracefully skips BGM.
 */
export function resolveBgmPath(tone: VideoTone): string | null {
	const filename = BGM_FILES[tone];
	const exact = path.join(BGM_DIR, filename);
	if (existsSync(exact)) return exact;

	// Fallback: any MP3 in the folder.
	try {
		const entries = readdirSync(BGM_DIR)
			.filter((f) => f.toLowerCase().endsWith(".mp3"))
			.sort();
		if (entries.length === 0) return null;
		const pick = path.join(BGM_DIR, entries[0]!);
		logger.info({
			msg: "bgm: tone file missing, falling back",
			requestedTone: tone,
			fallbackFile: entries[0],
			availableFiles: entries,
		});
		return pick;
	} catch {
		return null;
	}
}

export function listAvailableBgm(): Array<{ tone: VideoTone; available: boolean }> {
	return (Object.keys(BGM_FILES) as VideoTone[]).map((tone) => ({
		tone,
		available: resolveBgmPath(tone) !== null,
	}));
}
