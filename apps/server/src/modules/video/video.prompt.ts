/**
 * Build a short TTS voiceover script from the creator's idea + caption.
 * Target: 40–80 words, 10–20 seconds at natural TTS pace (~4 words/sec).
 *
 * Heuristic: start with caption, and if it's too short to carry a reel,
 * prepend a framing line from the idea. Captions alone are often 10 words =
 * ~3s of speech, which truncates multi-scene videos.
 */
export function buildVoiceoverScript(input: {
	idea: string;
	caption: string;
	hook?: string;
}): string {
	const caption = input.caption.trim().replace(/\s+/g, " ");
	const idea = input.idea.trim().replace(/\s+/g, " ");
	const hook = input.hook?.trim().replace(/\s+/g, " ");

	// Approx 4 chars/word, 4 words/sec → aim for 240+ chars (~60 words, ~15s)
	// so voiceover-driven videos reliably clear the 12s floor.
	const TARGET_MIN_CHARS = 240;
	const TARGET_MAX_CHARS = 500;

	const pieces: string[] = [];
	if (hook) pieces.push(hook);
	pieces.push(caption);

	let voiceover = pieces.join(" ").trim();

	// Still too short? Prepend the idea itself as framing context.
	if (voiceover.length < TARGET_MIN_CHARS && idea) {
		voiceover = `${idea}. ${voiceover}`.trim();
	}

	// Cap to avoid runaway reels.
	return voiceover.slice(0, TARGET_MAX_CHARS);
}
