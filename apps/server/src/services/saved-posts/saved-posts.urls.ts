import { logger } from "@server/lib/logger";
import { storage } from "@server/services/storage";

/**
 * Walk a stored SavedPost content body and collect every S3 object key it
 * references. Used at create/update time to populate the `s3_keys` column
 * so delete doesn't need to walk the JSONB again.
 */
export function collectS3Keys(content: Record<string, unknown>): string[] {
	const keys: string[] = [];

	// images[].objectKey
	const images = content.images;
	if (Array.isArray(images)) {
		for (const img of images) {
			if (img && typeof img === "object") {
				const key = (img as Record<string, unknown>).objectKey;
				if (typeof key === "string" && key.length > 0) keys.push(key);
			}
		}
	}

	// video.videoKey
	const video = content.video;
	if (video && typeof video === "object") {
		const key = (video as Record<string, unknown>).videoKey;
		if (typeof key === "string" && key.length > 0) keys.push(key);
	}

	return keys;
}

/**
 * Rehydrate a stored SavedPost body with fresh presigned GET URLs. For every
 * `images[].objectKey` present we overwrite `images[].url`; for `video.videoKey`
 * we overwrite `video.videoUrl`. Items without a stored key are left alone
 * (legacy saves, or mirror-failure fallbacks pointing at Replicate CDN).
 *
 * Mutates a shallow clone — the caller's JSONB in the DB is unchanged.
 */
export async function rehydrateUrls(
	content: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	const out = { ...content };

	const images = out.images;
	if (Array.isArray(images)) {
		const freshImages = await Promise.all(
			images.map(async (img) => {
				if (!img || typeof img !== "object") return img;
				const record = { ...(img as Record<string, unknown>) };
				const key = record.objectKey;
				if (typeof key === "string" && key.length > 0) {
					try {
						const { url } = await storage.presignGet({ key });
						record.url = url;
					} catch (err) {
						logger.warn({
							msg: "saved-posts: presign image failed",
							key,
							error: err instanceof Error ? err.message : String(err),
						});
					}
				}
				return record;
			}),
		);
		out.images = freshImages;
	}

	const video = out.video;
	if (video && typeof video === "object") {
		const record = { ...(video as Record<string, unknown>) };
		const key = record.videoKey;
		if (typeof key === "string" && key.length > 0) {
			try {
				const { url } = await storage.presignGet({
					key,
					ttlSec: 60 * 60 * 2,
				});
				record.videoUrl = url;
			} catch (err) {
				logger.warn({
					msg: "saved-posts: presign video failed",
					key,
					error: err instanceof Error ? err.message : String(err),
				});
			}
		}
		out.video = record;
	}

	return out;
}
