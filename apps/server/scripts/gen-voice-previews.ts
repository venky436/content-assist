/**
 * One-shot script: generate a short preview MP3 for each of the 6 OpenAI
 * TTS voices and write them to apps/server/src/assets/voice-previews/.
 *
 * The resulting MP3s are committed to the repo + served by the public
 * /voice-previews/:voice.mp3 route so the admin voice picker can preview
 * each voice without burning a TTS call per click.
 *
 * Usage (from apps/server):
 *   pnpm tsx --env-file=.env scripts/gen-voice-previews.ts
 *
 * Idempotent: skips voices whose MP3 already exists.
 */
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { synthesizeSpeech } from "../src/services/tts/openai-tts.client";

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type Voice = (typeof VOICES)[number];

// Same phrase across all voices so users compare timbre, not copy.
const SAMPLE =
	"This is how your voiceover will sound. Pick the one that matches your vibe.";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "..", "src", "assets", "voice-previews");

async function main() {
	console.log(`→ generating voice previews into ${OUT_DIR}`);
	for (const voice of VOICES) {
		const out = path.join(OUT_DIR, `${voice}.mp3`);
		if (existsSync(out)) {
			console.log(`  ✓ ${voice}.mp3 already exists, skipping`);
			continue;
		}
		console.log(`  … synthesising ${voice}`);
		const mp3 = await synthesizeSpeech(SAMPLE, { voice: voice as Voice, speed: 1 });
		await writeFile(out, mp3);
		console.log(`  ✓ wrote ${voice}.mp3 (${mp3.byteLength} bytes)`);
	}
	console.log("done.");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
