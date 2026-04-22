import { z } from "zod";

/**
 * Creator profile schema. All fields nullable except `onboardingCompleted` —
 * a fresh user gets a lazy-created blank row. Enum validation lives in zod
 * (not Postgres), so widening (new niches/tones) doesn't need a migration.
 */

export const nicheEnum = z.enum([
	"beauty",
	"finance",
	"fitness",
	"food",
	"travel",
	"tech",
	"edu",
	"lifestyle",
	"business",
	"comedy",
	"other",
]);
export type Niche = z.infer<typeof nicheEnum>;

export const toneEnum = z.enum([
	"casual",
	"professional",
	"witty",
	"bold",
	"warm",
]);
export type Tone = z.infer<typeof toneEnum>;

export const bgmMoodEnum = z.enum([
	"uplifting",
	"chill",
	"dramatic",
	"minimal",
	"none",
]);
export type BgmMood = z.infer<typeof bgmMoodEnum>;

/** 3–20 chars, lowercase letters + digits + underscore. */
const usernameRegex = /^[a-z0-9_]{3,20}$/;
const socialHandleRegex = /^[A-Za-z0-9_.]{1,30}$/;
const phoneRegex = /^\+?[0-9\s\-]{7,20}$/;

/** What the server returns — includes resolved presigned URLs for avatar/cover. */
export const profileSchema = z.object({
	userId: z.string().uuid(),

	username: z.string().nullable(),
	avatarKey: z.string().nullable(),
	avatarUrl: z.string().url().nullable(),
	coverKey: z.string().nullable(),
	coverUrl: z.string().url().nullable(),

	bio: z.string().max(160).nullable(),
	phone: z.string().nullable(),
	locationCity: z.string().nullable(),
	locationCountry: z.string().nullable(),
	timezone: z.string().nullable(),
	website: z.string().nullable(),

	niche: nicheEnum.nullable(),
	languages: z.array(z.string().min(2).max(8)).max(6),

	instagramHandle: z.string().nullable(),
	tiktokHandle: z.string().nullable(),
	youtubeHandle: z.string().nullable(),
	twitterHandle: z.string().nullable(),

	defaultTone: toneEnum.nullable(),
	defaultVoice: z.string().nullable(),
	defaultBgmMood: bgmMoodEnum.nullable(),
	signatureCta: z.string().max(80).nullable(),

	onboardingCompleted: z.boolean(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});
export type Profile = z.infer<typeof profileSchema>;

/** Fields a client may update. Nulling a field clears it. */
export const updateProfileRequestSchema = z
	.object({
		username: z.string().regex(usernameRegex).nullable(),
		bio: z.string().max(160).nullable(),
		phone: z.string().regex(phoneRegex).nullable(),
		locationCity: z.string().min(1).max(60).nullable(),
		locationCountry: z.string().min(1).max(60).nullable(),
		timezone: z.string().min(1).max(60).nullable(),
		website: z.string().url().max(200).nullable(),

		niche: nicheEnum.nullable(),
		languages: z.array(z.string().min(2).max(8)).max(6),

		instagramHandle: z.string().regex(socialHandleRegex).nullable(),
		tiktokHandle: z.string().regex(socialHandleRegex).nullable(),
		youtubeHandle: z.string().regex(socialHandleRegex).nullable(),
		twitterHandle: z.string().regex(socialHandleRegex).nullable(),

		defaultTone: toneEnum.nullable(),
		defaultVoice: z.string().min(1).max(60).nullable(),
		defaultBgmMood: bgmMoodEnum.nullable(),
		signatureCta: z.string().max(80).nullable(),

		onboardingCompleted: z.boolean(),
	})
	.partial();
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

export const profileResponseSchema = z.object({ profile: profileSchema });
export type ProfileResponse = z.infer<typeof profileResponseSchema>;

export const profileErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
});
export type ProfileError = z.infer<typeof profileErrorSchema>;
