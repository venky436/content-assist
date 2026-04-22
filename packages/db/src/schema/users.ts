import {
	pgTable,
	uuid,
	text,
	boolean,
	timestamp,
	index,
} from "drizzle-orm/pg-core";

/**
 * Application users. Email + password (bcrypt) is the only path today, but
 * the shape is future-proofed for OAuth / OTP (`provider` enum + nullable
 * `passwordHash`) so we don't need a migration when those land.
 */
export const users = pgTable(
	"users",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		email: text("email").notNull().unique(),
		/** Nullable for OAuth / OTP users. Required when `provider === "email"`. */
		passwordHash: text("password_hash"),
		name: text("name").notNull(),
		/** Login method. Today only "email"; "google" / "otp" are reserved for later. */
		provider: text("provider", { enum: ["email", "google", "otp"] })
			.notNull()
			.default("email"),
		/** Unlocks admin-only screens + endpoints later. Defaults false for every signup. */
		isAdmin: boolean("is_admin").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		emailIdx: index("users_email_idx").on(t.email),
	}),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
