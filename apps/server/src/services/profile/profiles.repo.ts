import { eq } from "drizzle-orm";
import {
	userProfiles,
	type NewUserProfile,
	type UserProfile,
} from "@content-assist/db/schema";
import { getDb } from "./db";

/** Fields a repo caller may patch. We whitelist here — the DB shape is wider. */
export type ProfilePatch = Partial<{
	username: string | null;
	avatarKey: string | null;
	coverKey: string | null;
	bio: string | null;
	phone: string | null;
	locationCity: string | null;
	locationCountry: string | null;
	timezone: string | null;
	website: string | null;
	niche: string | null;
	languages: string[];
	instagramHandle: string | null;
	tiktokHandle: string | null;
	youtubeHandle: string | null;
	twitterHandle: string | null;
	defaultTone: string | null;
	defaultVoice: string | null;
	defaultBgmMood: string | null;
	signatureCta: string | null;
	onboardingCompleted: boolean;
}>;

export const profilesRepo = {
	/**
	 * Lazy-get-or-create. First access returns a fresh blank row with
	 * `onboardingCompleted: false`, rather than 404-ing.
	 */
	async findOrCreate(userId: string): Promise<UserProfile> {
		const existing = await profilesRepo.findByUserId(userId);
		if (existing) return existing;
		return profilesRepo.create({ userId });
	},

	async findByUserId(userId: string): Promise<UserProfile | null> {
		const rows = await getDb()
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.userId, userId))
			.limit(1);
		return rows[0] ?? null;
	},

	async findByUsername(username: string): Promise<UserProfile | null> {
		const rows = await getDb()
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.username, username))
			.limit(1);
		return rows[0] ?? null;
	},

	async create(input: NewUserProfile): Promise<UserProfile> {
		const [row] = await getDb().insert(userProfiles).values(input).returning();
		if (!row) throw new Error("profiles.create: no row returned");
		return row;
	},

	async update(userId: string, patch: ProfilePatch): Promise<UserProfile> {
		const [row] = await getDb()
			.update(userProfiles)
			.set({ ...patch, updatedAt: new Date() })
			.where(eq(userProfiles.userId, userId))
			.returning();
		if (!row) throw new Error("profiles.update: no row updated");
		return row;
	},
};

export type { UserProfile };
