import { randomUUID } from "node:crypto";
import {
	DeleteObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	GetObjectCommand,
	S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "@server/config";
import { logger } from "@server/lib/logger";
import { getS3Client } from "./s3.client";
import type {
	BuildKeyInput,
	HeadObjectResult,
	PresignGetInput,
	PresignGetResult,
	PresignPutInput,
	PresignPutResult,
	StorageProvider,
} from "./types";

function isoAfter(seconds: number): string {
	return new Date(Date.now() + seconds * 1000).toISOString();
}

/**
 * S3 (or S3-compatible) implementation of StorageProvider.
 *
 * Design notes:
 * - `presignPut` burns the `Content-Type` into the signature, so the client
 *   can't PUT a file with a different mime than we authorised. The Content-
 *   Length-Range constraint isn't enforceable on a plain presigned PUT (only
 *   on POST policies), so we additionally HEAD-verify the size on confirm.
 * - Object keys: `{prefix}/{userId}/{uuid}.{ext}`. The UUID suffix prevents
 *   enumeration and lets us keep historical versions of the same upload.
 */
export const storage: StorageProvider = {
	async presignPut(input: PresignPutInput): Promise<PresignPutResult> {
		const ttl = input.ttlSec ?? config.presignedPutTtlSec;
		const cmd = new PutObjectCommand({
			Bucket: config.s3Bucket,
			Key: input.key,
			ContentType: input.contentType,
		});
		const uploadUrl = await getSignedUrl(getS3Client(), cmd, {
			expiresIn: ttl,
		});
		return { uploadUrl, expiresAt: isoAfter(ttl) };
	},

	async presignGet(input: PresignGetInput): Promise<PresignGetResult> {
		const ttl = input.ttlSec ?? config.presignedGetTtlSec;
		const cmd = new GetObjectCommand({
			Bucket: config.s3Bucket,
			Key: input.key,
		});
		const url = await getSignedUrl(getS3Client(), cmd, { expiresIn: ttl });
		return { url, expiresAt: isoAfter(ttl) };
	},

	async headObject(key: string): Promise<HeadObjectResult> {
		try {
			const out = await getS3Client().send(
				new HeadObjectCommand({ Bucket: config.s3Bucket, Key: key }),
			);
			return {
				size: Number(out.ContentLength ?? 0),
				contentType: out.ContentType ?? "application/octet-stream",
			};
		} catch (err) {
			if (err instanceof S3ServiceException) {
				// 404 / NoSuchKey / NotFound — treat as absent.
				if (
					err.name === "NotFound" ||
					err.$metadata?.httpStatusCode === 404
				) {
					return null;
				}
			}
			logger.warn({
				msg: "storage.headObject: error",
				key,
				error: err instanceof Error ? err.message : String(err),
			});
			return null;
		}
	},

	async deleteObject(key: string): Promise<void> {
		try {
			await getS3Client().send(
				new DeleteObjectCommand({ Bucket: config.s3Bucket, Key: key }),
			);
		} catch (err) {
			// Swallow — orphaned S3 objects are a cleanup problem, not a request
			// failure. Log so a future reconciliation job can sweep.
			logger.warn({
				msg: "storage.deleteObject: error",
				key,
				error: err instanceof Error ? err.message : String(err),
			});
		}
	},

	buildKey({ prefix, userId, ext }: BuildKeyInput): string {
		const cleanExt = ext.replace(/^\.+/, "").toLowerCase() || "bin";
		return `${prefix}/${userId}/${randomUUID()}.${cleanExt}`;
	},
};
