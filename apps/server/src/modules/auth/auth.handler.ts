import type { RouteHandler } from "@hono/zod-openapi";
import type { AuthUser } from "@content-assist/shared";
import { logger } from "@server/lib/logger";
import type { AppEnv } from "@server/middleware/auth.middleware";
import {
	hashPassword,
	signAuthToken,
	usersRepo,
	verifyPassword,
	type User,
} from "@server/services/auth";
import { profilesRepo } from "@server/services/profile";
import { storage } from "@server/services/storage";
import type {
	meRoute,
	signInRoute,
	signOutRoute,
	signUpRoute,
} from "@server/modules/auth/auth.schema";

function toAuthUser(u: User): AuthUser {
	return {
		id: u.id,
		email: u.email,
		name: u.name,
		provider: u.provider,
		isAdmin: u.isAdmin,
		createdAt: u.createdAt.toISOString(),
	};
}

/**
 * Fetch the user's profile and build an auth-surface DTO that includes
 * avatarUrl + username. Used by `/auth/me` so the sidebar's UserPill can
 * render the avatar on first paint without a separate /profile call.
 * Lazy-creates the profile row if it doesn't exist yet.
 */
async function toAuthUserWithProfile(u: User): Promise<AuthUser> {
	const base = toAuthUser(u);
	try {
		const prof = await profilesRepo.findOrCreate(u.id);
		const avatarUrl = prof.avatarKey
			? (await storage.presignGet({ key: prof.avatarKey })).url
			: null;
		return { ...base, avatarUrl, username: prof.username };
	} catch (err) {
		// Profile lookup failing shouldn't block auth. Log + return the bare user.
		logger.warn({
			msg: "auth.me: profile join failed",
			userId: u.id,
			error: err instanceof Error ? err.message : String(err),
		});
		return base;
	}
}

export const signUpHandler: RouteHandler<typeof signUpRoute, AppEnv> = async (c) => {
	const body = c.req.valid("json");
	const email = body.email.toLowerCase();

	const existing = await usersRepo.findByEmail(email);
	if (existing) {
		return c.json(
			{
				error: "email_taken",
				message: "An account with this email already exists.",
			},
			409,
		);
	}

	let created: User;
	try {
		const passwordHash = await hashPassword(body.password);
		created = await usersRepo.create({
			email,
			passwordHash,
			name: body.name.trim(),
		});
	} catch (err) {
		logger.error({
			msg: "auth.signup: failed",
			error: err instanceof Error ? err.message : String(err),
		});
		return c.json(
			{ error: "signup_failed", message: "Couldn't create account. Try again." },
			500,
		);
	}

	const token = await signAuthToken({ userId: created.id, email: created.email });
	logger.info({
		msg: "auth.signup: success",
		userId: created.id,
		email: created.email,
	});
	return c.json({ token, user: await toAuthUserWithProfile(created) }, 201);
};

export const signInHandler: RouteHandler<typeof signInRoute, AppEnv> = async (c) => {
	const body = c.req.valid("json");
	const email = body.email.toLowerCase();

	const user = await usersRepo.findByEmail(email);
	// Generic error in both branches — don't reveal whether the email exists.
	const invalid = () =>
		c.json(
			{
				error: "invalid_credentials",
				message: "That email and password didn't match.",
			},
			401,
		);

	if (!user || !user.passwordHash) return invalid();
	const ok = await verifyPassword(body.password, user.passwordHash);
	if (!ok) return invalid();

	const token = await signAuthToken({ userId: user.id, email: user.email });
	logger.info({
		msg: "auth.signin: success",
		userId: user.id,
		email: user.email,
	});
	return c.json({ token, user: await toAuthUserWithProfile(user) }, 200);
};

export const meHandler: RouteHandler<typeof meRoute, AppEnv> = async (c) => {
	const userId = c.get("userId");
	if (!userId) {
		return c.json({ error: "unauthorized", message: "Sign in to continue." }, 401);
	}
	const user = await usersRepo.findById(userId);
	if (!user) {
		return c.json({ error: "user_not_found", message: "Account no longer exists." }, 404);
	}
	return c.json({ user: await toAuthUserWithProfile(user) }, 200);
};

export const signOutHandler: RouteHandler<typeof signOutRoute, AppEnv> = async (c) => {
	// Stateless for Phase 1. Client clears its token.
	// Future: revoke refresh token in the DB here.
	const userId = c.get("userId");
	logger.info({ msg: "auth.signout", userId });
	return c.json({ ok: true as const }, 200);
};
