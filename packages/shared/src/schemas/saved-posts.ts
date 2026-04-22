import { z } from "zod";
import { contentTypeSchema } from "./generate";
import { videoEnergySchema, videoVoiceSchema } from "./video";

/**
 * Zod mirrors of the `SavedPost` TS type in `../types/index.ts`. Kept permissive
 * on purpose — the SavedPost body is a grab-bag of fields that vary by source
 * (generate vs analyze) and by contentType. Rather than model every branch,
 * we accept an object with known well-typed anchors and let the optional bits
 * pass through.
 *
 * This matches the server's storage strategy: the body is persisted verbatim
 * as JSONB. The server is authoritative for `id`, `createdAt`, `updatedAt`,
 * and every presigned URL under `images[].url` + `video.videoUrl`.
 */

export const savedPostSourceSchema = z.enum(["generate", "analyze"]);

export const savedPostModeSchema = z.enum(["faceless", "on_camera"]);

export const savedPostImageSchema = z.object({
	url: z.string().url(),
	prompt: z.string(),
	generatedAt: z.number().int().positive(),
	sceneType: z.enum(["struggle", "decision", "result"]).optional(),
	label: z.string().max(40).optional(),
	type: z.string().max(40).optional(),
	objectKey: z.string().min(1).optional(),
});

// Legacy saved posts from before we exposed the 6-voice picker stored
// `voice: "female" | "male"`. Map those forward on read so existing rows
// keep loading. New saves always land as one of the 6 OpenAI voice IDs.
const legacyVoiceAliasSchema = z.preprocess((v) => {
	if (v === "female") return "nova";
	if (v === "male") return "onyx";
	return v;
}, videoVoiceSchema.optional());

export const savedPostVideoSchema = z.object({
	videoUrl: z.string().url(),
	voiceover: z.string().min(1),
	durationMs: z.number().int().positive(),
	bgmUsed: z.boolean(),
	generatedAt: z.number().int().positive(),
	voice: legacyVoiceAliasSchema,
	videoKey: z.string().min(1).optional(),
	// When a user-uploaded audio track was used as BGM, we persist its object
	// key so Regenerate can rerun the composition with the same track.
	bgmKey: z.string().min(1).optional(),
	// Pacing bucket used when the video was rendered. Optional for back-compat
	// with older saves before the energy dimension shipped.
	energy: videoEnergySchema.optional(),
});

/**
 * The full stored/returned shape. `.passthrough()` on the body lets analyze-only
 * fields (score, verdict, improvedPost) and generate-only fields coexist on
 * the same schema without enumerating every branch.
 */
export const savedPostSchema = z
	.object({
		id: z.string().uuid(),
		source: savedPostSourceSchema,
		mode: savedPostModeSchema.optional(),
		idea: z.string().min(1),
		contentType: contentTypeSchema,

		// Generate — Faceless
		hooks: z.array(z.string()).optional(),
		recommendedHook: z.string().optional(),
		recommendedReason: z.string().optional(),
		caption: z.string().optional(),
		hashtags: z.array(z.string()).optional(),

		// Generate — On-Camera
		scriptHook: z.string().optional(),
		scriptLines: z.array(z.string()).optional(),
		scriptCta: z.string().optional(),

		// Analyze
		originalContent: z.string().optional(),
		score: z.number().optional(),
		verdict: z.enum(["Weak", "Average", "Strong", "Very Strong"]).optional(),
		betterHook: z.string().optional(),
		improvedPost: z.string().optional(),

		images: z.array(savedPostImageSchema).optional(),
		video: savedPostVideoSchema.optional(),

		createdAt: z.number().int().positive(),
		updatedAt: z.number().int().positive(),
	})
	.passthrough();

/**
 * POST /saved — the client sends the full body minus `id`, `createdAt`,
 * `updatedAt`. The server assigns those. We still accept `id` if present so
 * the localStorage→server migration can preserve existing ids when bulk-
 * POSTing legacy posts.
 */
export const savedPostRequestSchema = savedPostSchema
	.partial({ id: true, createdAt: true, updatedAt: true })
	.passthrough();
export type SavedPostRequest = z.infer<typeof savedPostRequestSchema>;

export const savedPostResponseSchema = z.object({
	post: savedPostSchema,
});
export type SavedPostResponse = z.infer<typeof savedPostResponseSchema>;

export const listSavedPostsRequestSchema = z.object({
	source: savedPostSourceSchema.optional(),
	cursor: z.string().datetime().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type ListSavedPostsRequest = z.infer<typeof listSavedPostsRequestSchema>;

export const listSavedPostsResponseSchema = z.object({
	items: z.array(savedPostSchema),
	nextCursor: z.string().datetime().nullable(),
});
export type ListSavedPostsResponse = z.infer<typeof listSavedPostsResponseSchema>;

export const savedPostErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
});
export type SavedPostError = z.infer<typeof savedPostErrorSchema>;
