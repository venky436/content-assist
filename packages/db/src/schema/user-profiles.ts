import { sql } from "drizzle-orm";
import {
	boolean,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Creator profile. Separate table (1:1 with `users`) so identity stays lean
 * and evolving profile fields don't churn the auth table.
 *
 * Row is lazy-created on first GET /profile — we don't backfill.
 * Enum-ish columns (`niche`, `defaultTone`, `defaultBgmMood`, `provider-style`)
 * are stored as `text` and validated at the zod schema layer. This keeps us
 * from writing a DB migration every time we add a new niche or tone.
 */
export const userProfiles = pgTable(
	"user_profiles",
	{
		userId: uuid("user_id")
			.primaryKey()
			.references(() => users.id, { onDelete: "cascade" }),

		// Identity
		username: text("username"),
		avatarKey: text("avatar_key"),
		coverKey: text("cover_key"),

		// About
		bio: text("bio"),
		phone: text("phone"),
		locationCity: text("location_city"),
		locationCountry: text("location_country"), // ISO-2
		timezone: text("timezone"), // IANA
		website: text("website"),

		// Niche + language
		niche: text("niche"),
		languages: text("languages")
			.array()
			.notNull()
			.default(sql`'{}'::text[]`),

		// Socials (raw handle, no `@`)
		instagramHandle: text("instagram_handle"),
		tiktokHandle: text("tiktok_handle"),
		youtubeHandle: text("youtube_handle"),
		twitterHandle: text("twitter_handle"),

		// Creator defaults feeding AI generation
		defaultTone: text("default_tone"),
		defaultVoice: text("default_voice"),
		defaultBgmMood: text("default_bgm_mood"),
		signatureCta: text("signature_cta"),

		// Meta
		onboardingCompleted: boolean("onboarding_completed")
			.notNull()
			.default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		usernameIdx: uniqueIndex("user_profiles_username_idx").on(t.username),
	}),
);

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
