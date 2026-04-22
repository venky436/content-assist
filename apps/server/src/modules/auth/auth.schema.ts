import { createRoute } from "@hono/zod-openapi";
import {
	authErrorSchema,
	authResponseSchema,
	meResponseSchema,
	signInRequestSchema,
	signOutResponseSchema,
	signUpRequestSchema,
} from "@content-assist/shared";

const signUpRequest = signUpRequestSchema.openapi("SignUpRequest");
const signInRequest = signInRequestSchema.openapi("SignInRequest");
const authResponse = authResponseSchema.openapi("AuthResponse");
const meResponse = meResponseSchema.openapi("MeResponse");
const signOutResponse = signOutResponseSchema.openapi("SignOutResponse");
const authError = authErrorSchema.openapi("AuthError");

export const signUpRoute = createRoute({
	method: "post",
	path: "/signup",
	tags: ["auth"],
	summary: "Create a new account and issue a JWT access token",
	request: {
		body: {
			content: { "application/json": { schema: signUpRequest } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: authResponse } },
			description: "Account created",
		},
		400: {
			content: { "application/json": { schema: authError } },
			description: "Invalid request",
		},
		409: {
			content: { "application/json": { schema: authError } },
			description: "Email already has an account",
		},
		429: {
			content: { "application/json": { schema: authError } },
			description: "Too many signups from this IP",
		},
		500: {
			content: { "application/json": { schema: authError } },
			description: "Signup failed",
		},
	},
});

export const signInRoute = createRoute({
	method: "post",
	path: "/signin",
	tags: ["auth"],
	summary: "Sign in with email + password",
	request: {
		body: {
			content: { "application/json": { schema: signInRequest } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: authResponse } },
			description: "Signed in",
		},
		400: {
			content: { "application/json": { schema: authError } },
			description: "Invalid request",
		},
		401: {
			content: { "application/json": { schema: authError } },
			description: "Invalid credentials",
		},
		429: {
			content: { "application/json": { schema: authError } },
			description: "Too many attempts",
		},
	},
});

export const meRoute = createRoute({
	method: "get",
	path: "/me",
	tags: ["auth"],
	summary: "Get the current user (requires Bearer token)",
	responses: {
		200: {
			content: { "application/json": { schema: meResponse } },
			description: "Current user",
		},
		401: {
			content: { "application/json": { schema: authError } },
			description: "Unauthorized",
		},
		404: {
			content: { "application/json": { schema: authError } },
			description: "User not found",
		},
	},
});

export const signOutRoute = createRoute({
	method: "post",
	path: "/signout",
	tags: ["auth"],
	summary: "Sign out (stateless — client clears token)",
	responses: {
		200: {
			content: { "application/json": { schema: signOutResponse } },
			description: "Signed out",
		},
		401: {
			content: { "application/json": { schema: authError } },
			description: "Unauthorized",
		},
	},
});
