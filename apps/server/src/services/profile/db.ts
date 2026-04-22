import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@content-assist/db/schema";
import { config } from "@server/config";

/**
 * Lazy Drizzle client shared by the profile + media repos. Matches the
 * pattern in `services/auth/users.repo.ts` — separate client so each service
 * package is independently pluggable + the zod env validation runs before
 * `postgres()` touches process.env.
 */
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
	if (_db) return _db;
	const client = postgres(config.databaseUrl, { max: 10 });
	_db = drizzle(client, { schema });
	return _db;
}
