import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "@server/config";
import { logger } from "@server/lib/logger";
import { getS3Client } from "./s3.client";

/**
 * Server-side S3 writers. Unlike the presigned PUT flow used by the admin
 * for user-initiated uploads, these run in-process on the server — they
 * handle bytes directly and authenticate with the IAM user's creds.
 *
 * Used by:
 *   - images.handler — fetches a Replicate URL into memory and persists it.
 *   - video.handler  — streams the composed MP4 off local disk into S3.
 */

/**
 * Fetch a remote URL (e.g. Replicate CDN) and PUT its bytes into S3 at the
 * given key. Throws on a non-2xx source or an S3 error. The Replicate URLs
 * we call against are small (<1 MB per image), so buffering the whole body
 * is fine. If we ever mirror video or larger bodies, switch to a streamed
 * approach via undici's `ReadableStream`.
 */
export async function mirrorUrlToS3(
	sourceUrl: string,
	targetKey: string,
	contentType: string,
): Promise<void> {
	const res = await fetch(sourceUrl);
	if (!res.ok) {
		throw new Error(`mirror: source GET failed ${res.status} for ${sourceUrl}`);
	}
	const body = Buffer.from(await res.arrayBuffer());
	await getS3Client().send(
		new PutObjectCommand({
			Bucket: config.s3Bucket,
			Key: targetKey,
			Body: body,
			ContentType: contentType,
		}),
	);
	logger.info({
		msg: "storage.mirrorUrlToS3",
		targetKey,
		sourceHost: safeHost(sourceUrl),
		sizeBytes: body.length,
	});
}

/**
 * Stream a local file into S3 at the given key. Used for composed videos —
 * the MP4 can be tens of MB and we don't want it in memory.
 */
export async function uploadFileToS3(
	localPath: string,
	targetKey: string,
	contentType: string,
): Promise<void> {
	const stats = await stat(localPath);
	await getS3Client().send(
		new PutObjectCommand({
			Bucket: config.s3Bucket,
			Key: targetKey,
			Body: createReadStream(localPath),
			ContentLength: stats.size,
			ContentType: contentType,
		}),
	);
	logger.info({
		msg: "storage.uploadFileToS3",
		targetKey,
		sizeBytes: stats.size,
	});
}

function safeHost(u: string): string {
	try {
		return new URL(u).host;
	} catch {
		return "unknown";
	}
}
