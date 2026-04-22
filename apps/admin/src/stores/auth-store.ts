"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthUser } from "@content-assist/shared";

/**
 * Single source of truth for the web admin's auth state.
 *
 * - Token persisted to localStorage via Zustand's `persist` middleware.
 * - A module-level `_token` mirror lets the ky api-client read the current
 *   token synchronously (beforeRequest hooks run before React hydrates).
 * - `bootstrap()` is called once by the (app)/layout on mount. It verifies
 *   the persisted token via /auth/me. On 401, clears state.
 */

export type AuthState = {
	token: string | null;
	user: AuthUser | null;
	isAuthenticated: boolean;
	/** True while `bootstrap()` is running on first load. */
	isLoading: boolean;
	signIn: (args: { email: string; password: string }) => Promise<void>;
	signUp: (args: {
		name: string;
		email: string;
		password: string;
	}) => Promise<void>;
	signOut: () => Promise<void>;
	bootstrap: () => Promise<void>;
	/** Imperatively wipe auth (used by the api-client 401 handler). */
	clearAuth: () => void;
};

let _token: string | null = null;

/** Read the current token synchronously (used by the ky beforeRequest hook). */
export function getAuthTokenSync(): string | null {
	if (_token) return _token;
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem("contentassist:auth");
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { state?: { token?: unknown } };
		const t = parsed?.state?.token;
		return typeof t === "string" ? t : null;
	} catch {
		return null;
	}
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
	const prefix =
		process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
	const res = await fetch(`${prefix}${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		const message =
			typeof json.message === "string"
				? json.message
				: `Request failed (${res.status})`;
		const err = new Error(message) as Error & { status?: number; body?: unknown };
		err.status = res.status;
		err.body = json;
		throw err;
	}
	return json as T;
}

async function getJson<T>(path: string, token: string): Promise<T> {
	const prefix =
		process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
	const res = await fetch(`${prefix}${path}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		const message =
			typeof json.message === "string"
				? json.message
				: `Request failed (${res.status})`;
		const err = new Error(message) as Error & { status?: number };
		err.status = res.status;
		throw err;
	}
	return json as T;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			token: null,
			user: null,
			isAuthenticated: false,
			isLoading: true,

			async signIn({ email, password }) {
				const data = await postJson<{ token: string; user: AuthUser }>(
					"/auth/signin",
					{ email, password },
				);
				_token = data.token;
				set({
					token: data.token,
					user: data.user,
					isAuthenticated: true,
					isLoading: false,
				});
			},

			async signUp({ name, email, password }) {
				const data = await postJson<{ token: string; user: AuthUser }>(
					"/auth/signup",
					{ name, email, password },
				);
				_token = data.token;
				set({
					token: data.token,
					user: data.user,
					isAuthenticated: true,
					isLoading: false,
				});
			},

			async signOut() {
				const token = get().token;
				if (token) {
					try {
						await fetch(
							`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/auth/signout`,
							{
								method: "POST",
								headers: { Authorization: `Bearer ${token}` },
							},
						);
					} catch {
						// stateless signout — safe to ignore network errors.
					}
				}
				get().clearAuth();
			},

			async bootstrap() {
				// Seed the in-memory mirror from whatever Zustand just hydrated.
				const stored = get().token;
				if (stored) _token = stored;

				const token = _token;
				if (!token) {
					set({ isLoading: false, isAuthenticated: false, user: null });
					return;
				}
				try {
					const data = await getJson<{ user: AuthUser }>("/auth/me", token);
					set({
						user: data.user,
						isAuthenticated: true,
						isLoading: false,
					});
				} catch {
					// Token rejected or network fail — clear auth so the guard redirects.
					_token = null;
					set({
						token: null,
						user: null,
						isAuthenticated: false,
						isLoading: false,
					});
				}
			},

			clearAuth() {
				_token = null;
				set({
					token: null,
					user: null,
					isAuthenticated: false,
					isLoading: false,
				});
			},
		}),
		{
			name: "contentassist:auth",
			storage: createJSONStorage(() => localStorage),
			partialize: (s) => ({ token: s.token, user: s.user }),
			onRehydrateStorage: () => (state) => {
				// Keep the module-level mirror in sync post-hydration.
				_token = state?.token ?? null;
			},
		},
	),
);
