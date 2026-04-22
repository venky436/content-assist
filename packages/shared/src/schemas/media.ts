import { z } from "zod";

/** Generic media kind discriminator. Add `video` / `template` here later — zero migration. */
export const mediaKindEnum = z.enum(["audio", "image"]);
export type MediaKind = z.infer<typeof mediaKindEnum>;

export const mediaMetadataSchema = z
	.object({
		durationSec: z.number().nonnegative().optional(),
		width: z.number().int().positive().optional(),
		height: z.number().int().positive().optional(),
	})
	.strict();
export type MediaMetadata = z.infer<typeof mediaMetadataSchema>;

/** Shape sent back to the client. `url` is a short-lived presigned GET. */
export const mediaAssetSchema = z.object({
	id: z.string().uuid(),
	kind: mediaKindEnum,
	name: z.string().min(1).max(120),
	url: z.string().url(),
	urlExpiresAt: z.string().datetime(),
	mime: z.string(),
	sizeBytes: z.number().int().positive(),
	metadata: mediaMetadataSchema,
	tags: z.array(z.string().min(1).max(30)).max(10),
	createdAt: z.string().datetime(),
	/** S3 object key — exposed so the owner can reference their own asset in
	 * downstream requests (e.g. custom BGM in /video/generate). Ownership is
	 * re-checked server-side on every use; this is not a trust boundary. */
	objectKey: z.string().min(1),
});
export type MediaAsset = z.infer<typeof mediaAssetSchema>;

export const listMediaRequestSchema = z.object({
	kind: mediaKindEnum.optional(),
	cursor: z.string().datetime().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type ListMediaRequest = z.infer<typeof listMediaRequestSchema>;

export const listMediaResponseSchema = z.object({
	items: z.array(mediaAssetSchema),
	nextCursor: z.string().datetime().nullable(),
});
export type ListMediaResponse = z.infer<typeof listMediaResponseSchema>;

export const updateMediaRequestSchema = z
	.object({
		name: z.string().min(1).max(120),
		tags: z.array(z.string().min(1).max(30)).max(10),
	})
	.partial();
export type UpdateMediaRequest = z.infer<typeof updateMediaRequestSchema>;

export const mediaErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
});
export type MediaError = z.infer<typeof mediaErrorSchema>;
