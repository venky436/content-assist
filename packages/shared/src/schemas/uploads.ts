import { z } from "zod";
import { mediaKindEnum } from "./media";

/** What you can request a presign for. Wider than MediaKind — includes avatar/cover. */
export const uploadKindEnum = z.enum(["avatar", "cover", "audio", "image"]);
export type UploadKind = z.infer<typeof uploadKindEnum>;

/** Per-kind size cap (bytes) + mime whitelist. Single source of truth on the client too. */
export const UPLOAD_LIMITS = {
	avatar: {
		maxBytes: 2 * 1024 * 1024, // 2 MB
		mime: ["image/jpeg", "image/png", "image/webp"] as const,
	},
	cover: {
		maxBytes: 4 * 1024 * 1024, // 4 MB
		mime: ["image/jpeg", "image/png", "image/webp"] as const,
	},
	image: {
		maxBytes: 8 * 1024 * 1024, // 8 MB
		mime: ["image/jpeg", "image/png", "image/webp"] as const,
	},
	audio: {
		maxBytes: 20 * 1024 * 1024, // 20 MB
		mime: [
			"audio/mpeg",
			"audio/wav",
			"audio/mp4",
			"audio/x-m4a",
			"audio/aac",
		] as const,
	},
} as const;

export const presignRequestSchema = z.object({
	kind: uploadKindEnum,
	mime: z.string().min(3).max(100),
	sizeBytes: z.number().int().positive(),
	filename: z.string().min(1).max(200),
});
export type PresignRequest = z.infer<typeof presignRequestSchema>;

export const presignResponseSchema = z.object({
	uploadUrl: z.string().url(),
	objectKey: z.string(),
	expiresAt: z.string().datetime(),
	maxSizeBytes: z.number().int().positive(),
	contentType: z.string(),
});
export type PresignResponse = z.infer<typeof presignResponseSchema>;

export const confirmUploadRequestSchema = z.object({
	objectKey: z.string().min(1).max(500),
	kind: uploadKindEnum,
	/** Display name for media library items; ignored for avatar/cover. */
	name: z.string().min(1).max(120).optional(),
	/** Client-measured for audio (ffprobe later server-side). */
	durationSec: z.number().nonnegative().optional(),
	/** Client-measured for images via `new Image()`. */
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	tags: z.array(z.string().min(1).max(30)).max(10).optional(),
});
export type ConfirmUploadRequest = z.infer<typeof confirmUploadRequestSchema>;

/** Discriminated response — avatar/cover just return the profile URL; audio/image return a full asset row. */
export const confirmUploadResponseSchema = z.union([
	z.object({
		kind: z.enum(["avatar", "cover"]),
		url: z.string().url(),
		urlExpiresAt: z.string().datetime(),
	}),
	z.object({
		kind: mediaKindEnum,
		asset: z.object({
			id: z.string().uuid(),
			kind: mediaKindEnum,
			name: z.string(),
			url: z.string().url(),
			urlExpiresAt: z.string().datetime(),
			mime: z.string(),
			sizeBytes: z.number().int().positive(),
			metadata: z.object({
				durationSec: z.number().nonnegative().optional(),
				width: z.number().int().positive().optional(),
				height: z.number().int().positive().optional(),
			}),
			tags: z.array(z.string()),
			createdAt: z.string().datetime(),
		}),
	}),
]);
export type ConfirmUploadResponse = z.infer<typeof confirmUploadResponseSchema>;

export const uploadErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
});
export type UploadError = z.infer<typeof uploadErrorSchema>;
