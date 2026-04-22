import type { RouteHandler } from "@hono/zod-openapi";
import type { Profile } from "@content-assist/shared";
import { logger } from "@server/lib/logger";
import type { AppEnv } from "@server/middleware/auth.middleware";
import { profilesRepo, type UserProfile } from "@server/services/profile";
import { storage } from "@server/services/storage";
import type {
	getProfileRoute,
	updateProfileRoute,
} from "@server/modules/profile/profile.schema";

const RESERVED_USERNAMES = new Set([
	"admin",
	"administrator",
	"api",
	"app",
	"auth",
	"help",
	"home",
	"login",
	"me",
	"mod",
	"moderator",
	"profile",
	"root",
	"settings",
	"signin",
	"signup",
	"support",
	"system",
	"user",
	"www",
]);

async function presignOrNull(key: string | null): Promise<{
	url: string;
	expiresAt: string;
} | null> {
	if (!key) return null;
	return storage.presignGet({ key });
}

async function toProfileDTO(row: UserProfile): Promise<Profile> {
	const [avatar, cover] = await Promise.all([
		presignOrNull(row.avatarKey),
		presignOrNull(row.coverKey),
	]);
	return {
		userId: row.userId,
		username: row.username,
		avatarKey: row.avatarKey,
		avatarUrl: avatar?.url ?? null,
		coverKey: row.coverKey,
		coverUrl: cover?.url ?? null,
		bio: row.bio,
		phone: row.phone,
		locationCity: row.locationCity,
		locationCountry: row.locationCountry,
		timezone: row.timezone,
		website: row.website,
		niche: (row.niche ?? null) as Profile["niche"],
		languages: row.languages,
		instagramHandle: row.instagramHandle,
		tiktokHandle: row.tiktokHandle,
		youtubeHandle: row.youtubeHandle,
		twitterHandle: row.twitterHandle,
		defaultTone: (row.defaultTone ?? null) as Profile["defaultTone"],
		defaultVoice: row.defaultVoice,
		defaultBgmMood: (row.defaultBgmMood ?? null) as Profile["defaultBgmMood"],
		signatureCta: row.signatureCta,
		onboardingCompleted: row.onboardingCompleted,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

export const getProfileHandler: RouteHandler<typeof getProfileRoute, AppEnv> = async (c) => {
	const userId = c.get("userId");
	const row = await profilesRepo.findOrCreate(userId);
	const profile = await toProfileDTO(row);
	return c.json({ profile }, 200);
};

export const updateProfileHandler: RouteHandler<typeof updateProfileRoute, AppEnv> = async (c) => {
	const userId = c.get("userId");
	const body = c.req.valid("json");

	// Ensure the row exists (lazy-create first) so update() isn't a no-op.
	await profilesRepo.findOrCreate(userId);

	// Username gets special handling: lowercase, reserved check, collision → 409.
	const patch = { ...body };
	if (patch.username !== undefined && patch.username !== null) {
		const normalised = patch.username.toLowerCase();
		if (RESERVED_USERNAMES.has(normalised)) {
			return c.json(
				{ error: "username_reserved", message: "That username is reserved." },
				400,
			);
		}
		const clashingProfile = await profilesRepo.findByUsername(normalised);
		if (clashingProfile && clashingProfile.userId !== userId) {
			return c.json(
				{ error: "username_taken", message: "That username is taken." },
				409,
			);
		}
		patch.username = normalised;
	}

	try {
		const updated = await profilesRepo.update(userId, patch);
		const profile = await toProfileDTO(updated);
		logger.info({ msg: "profile.update", userId, fields: Object.keys(body) });
		return c.json({ profile }, 200);
	} catch (err) {
		// Fallback for race condition where two clients take the same username
		// between our check and the update statement.
		if (err instanceof Error && /unique/i.test(err.message)) {
			return c.json(
				{ error: "username_taken", message: "That username is taken." },
				409,
			);
		}
		throw err;
	}
};
