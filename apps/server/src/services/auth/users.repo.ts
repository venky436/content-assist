import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@content-assist/db/schema";
import { config } from "@server/config";

// Create a server-local DB client. We can't reuse the one from @content-assist/db
// directly because that package reads DATABASE_URL at import time from process.env,
// which races our zod env validation. Instead we lazy-create here off the validated config.
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
	if (_db) return _db;
	const client = postgres(config.databaseUrl, { max: 10 });
	_db = drizzle(client, { schema });
	return _db;
}

type User = typeof schema.users.$inferSelect;

export const usersRepo = {
	async findByEmail(email: string): Promise<User | null> {
		const rows = await getDb()
			.select()
			.from(schema.users)
			.where(eq(schema.users.email, email.toLowerCase()))
			.limit(1);
		return rows[0] ?? null;
	},

	async findById(id: string): Promise<User | null> {
		const rows = await getDb()
			.select()
			.from(schema.users)
			.where(eq(schema.users.id, id))
			.limit(1);
		return rows[0] ?? null;
	},

	async create(input: {
		email: string;
		passwordHash: string;
		name: string;
	}): Promise<User> {
		const [row] = await getDb()
			.insert(schema.users)
			.values({
				email: input.email.toLowerCase(),
				passwordHash: input.passwordHash,
				name: input.name.trim(),
			})
			.returning();
		if (!row) throw new Error("users.create: no row returned");
		return row;
	},
};

export type { User };
