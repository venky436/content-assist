/**
 * Storage provider interface. Keeps the rest of the app decoupled from S3.
 * Swapping to R2 / Backblaze / MinIO is one factory swap + an env var (S3_ENDPOINT).
 */

export type PresignPutInput = {
	key: string;
	contentType: string;
	maxBytes: number;
	/** Override the default TTL from config. */
	ttlSec?: number;
};

export type PresignPutResult = {
	uploadUrl: string;
	expiresAt: string; // ISO
};

export type PresignGetInput = {
	key: string;
	ttlSec?: number;
};

export type PresignGetResult = {
	url: string;
	expiresAt: string; // ISO
};

export type HeadObjectResult = {
	size: number;
	contentType: string;
} | null;

export type BuildKeyInput = {
	prefix:
		| "avatars"
		| "covers"
		| "audio"
		| "images"
		| "generated-images"
		| "generated-videos";
	userId: string;
	ext: string;
};

export interface StorageProvider {
	presignPut(input: PresignPutInput): Promise<PresignPutResult>;
	presignGet(input: PresignGetInput): Promise<PresignGetResult>;
	headObject(key: string): Promise<HeadObjectResult>;
	deleteObject(key: string): Promise<void>;
	buildKey(input: BuildKeyInput): string;
}
