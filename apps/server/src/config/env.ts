import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	SERVER_PORT: z.coerce.number().int().positive().default(3000),
	GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
	REPLICATE_API_TOKEN: z.string().min(1, "REPLICATE_API_TOKEN is required"),
	OPENAI_API_KEY: z.string().min(1).optional(),
	// --- Auth ---
	DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
	JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
	JWT_EXPIRES_IN: z.string().default("7d"),
	// --- Object storage (S3 or S3-compatible) ---
	AWS_REGION: z.string().min(1, "AWS_REGION is required"),
	S3_BUCKET: z.string().min(1, "S3_BUCKET is required"),
	AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
	AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),
	/** Optional override for S3-compatible providers (R2 / MinIO / Backblaze).
	 *  An empty string in `.env` means "unset" — docker-compose forwards the
	 *  var as "" rather than unsetting it, so we normalise before validating. */
	S3_ENDPOINT: z
		.string()
		.transform((v) => (v === "" ? undefined : v))
		.pipe(z.string().url().optional())
		.optional(),
	/** Presigned GET URL lifetime (served asset URLs). Default 1h. */
	PRESIGNED_GET_TTL_SEC: z.coerce.number().int().positive().default(3600),
	/** Presigned PUT URL lifetime (upload window). Default 5min. */
	PRESIGNED_PUT_TTL_SEC: z.coerce.number().int().positive().default(300),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	const issues = parsed.error.issues
		.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
		.join("\n");
	console.error(`Invalid environment configuration:\n${issues}`);
	process.exit(1);
}

export const config = {
	env: parsed.data.NODE_ENV,
	port: parsed.data.SERVER_PORT,
	geminiApiKey: parsed.data.GEMINI_API_KEY,
	replicateApiToken: parsed.data.REPLICATE_API_TOKEN,
	openaiApiKey: parsed.data.OPENAI_API_KEY,
	databaseUrl: parsed.data.DATABASE_URL,
	jwtSecret: parsed.data.JWT_SECRET,
	jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
	awsRegion: parsed.data.AWS_REGION,
	s3Bucket: parsed.data.S3_BUCKET,
	awsAccessKeyId: parsed.data.AWS_ACCESS_KEY_ID,
	awsSecretAccessKey: parsed.data.AWS_SECRET_ACCESS_KEY,
	s3Endpoint: parsed.data.S3_ENDPOINT,
	presignedGetTtlSec: parsed.data.PRESIGNED_GET_TTL_SEC,
	presignedPutTtlSec: parsed.data.PRESIGNED_PUT_TTL_SEC,
	isDev: parsed.data.NODE_ENV === "development",
} as const;

export type Config = typeof config;
