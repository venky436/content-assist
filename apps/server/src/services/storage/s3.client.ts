import { S3Client } from "@aws-sdk/client-s3";
import { config } from "@server/config";

/**
 * Lazy singleton S3 client. Reads `S3_ENDPOINT` so we can point at R2 /
 * MinIO / Backblaze without touching calling code.
 *
 * `forcePathStyle: true` keeps us compatible with S3-compatible providers
 * that don't support virtual-hosted-style buckets (MinIO, some R2 setups).
 * For pure AWS this still works — the SDK just uses path-style URLs.
 */
let _client: S3Client | null = null;

export function getS3Client(): S3Client {
	if (_client) return _client;
	_client = new S3Client({
		region: config.awsRegion,
		credentials: {
			accessKeyId: config.awsAccessKeyId,
			secretAccessKey: config.awsSecretAccessKey,
		},
		...(config.s3Endpoint
			? { endpoint: config.s3Endpoint, forcePathStyle: true }
			: {}),
	});
	return _client;
}
