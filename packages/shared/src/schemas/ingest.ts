import { z } from "zod";

/**
 * Normalised ingest output. Whether the user uploaded a video, an image, or
 * (future) something else, the server converges every path into this shape.
 * The client pours `context` into the existing `idea` (Generate) or
 * `content` (Analyze) field.
 */

export const contextTypeSchema = z.enum([
	"HUMAN",
	"LOCATION",
	"OBJECT",
	"ABSTRACT",
]);
export type ContextType = z.infer<typeof contextTypeSchema>;

export const ingestResponseSchema = z.object({
	/** The cleaned-up content idea. May be empty if no speech/text was detected. */
	context: z.string().max(600),
	/** Subject classification — useful for niche-aware generation later. */
	type: contextTypeSchema,
	/** Raw Whisper transcript (video ingest only). Truncated for wire size. */
	transcript: z.string().max(600).optional(),
	/** Raw Vision OCR output (image ingest only). Truncated for wire size. */
	extractedText: z.string().max(600).optional(),
});
export type IngestResponse = z.infer<typeof ingestResponseSchema>;

export const ingestErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
});
export type IngestError = z.infer<typeof ingestErrorSchema>;

/** Size caps mirrored in the admin for early client-side rejection. */
export const INGEST_LIMITS = {
	video: {
		maxBytes: 50 * 1024 * 1024, // 50 MB
		maxDurationSec: 30,
		mimePrefix: "video/",
	},
	image: {
		maxBytes: 8 * 1024 * 1024, // 8 MB
		mime: ["image/jpeg", "image/png", "image/webp"] as const,
	},
} as const;
