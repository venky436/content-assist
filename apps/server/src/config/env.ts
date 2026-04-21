import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	SERVER_PORT: z.coerce.number().int().positive().default(3000),
	GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
	REPLICATE_API_TOKEN: z.string().min(1, "REPLICATE_API_TOKEN is required"),
	OPENAI_API_KEY: z.string().min(1).optional(),
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
	isDev: parsed.data.NODE_ENV === "development",
} as const;

export type Config = typeof config;
