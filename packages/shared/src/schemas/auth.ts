import { z } from "zod";

/**
 * Canonical shape of a user surfaced to the client. Matches DB columns the
 * client is allowed to see — NEVER includes `passwordHash`.
 */
export const authUserSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	name: z.string().min(1).max(80),
	provider: z.enum(["email", "google", "otp"]),
	isAdmin: z.boolean(),
	createdAt: z.string().datetime().optional(),
	/** Short-lived presigned URL for the profile avatar, if uploaded. */
	avatarUrl: z.string().url().nullable().optional(),
	/** Username once the creator has picked one. */
	username: z.string().nullable().optional(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const signUpRequestSchema = z.object({
	name: z.string().min(1).max(80),
	email: z.string().email().max(200),
	password: z.string().min(8).max(128),
});
export type SignUpRequest = z.infer<typeof signUpRequestSchema>;

export const signInRequestSchema = z.object({
	email: z.string().email().max(200),
	password: z.string().min(1).max(128),
});
export type SignInRequest = z.infer<typeof signInRequestSchema>;

export const authResponseSchema = z.object({
	token: z.string().min(20),
	user: authUserSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const meResponseSchema = z.object({
	user: authUserSchema,
});
export type MeResponse = z.infer<typeof meResponseSchema>;

export const signOutResponseSchema = z.object({
	ok: z.literal(true),
});
export type SignOutResponse = z.infer<typeof signOutResponseSchema>;

export const authErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
});
export type AuthError = z.infer<typeof authErrorSchema>;
