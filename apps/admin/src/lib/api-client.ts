import ky, { HTTPError } from "ky";
import type { ZodTypeAny, z } from "zod";
import { getAuthTokenSync, useAuthStore } from "@/stores/auth-store";

const prefixUrl =
	process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";

/**
 * Paths that must NEVER trigger the auth 401 handler — a 401 from these
 * is part of the normal flow (bad creds, expired refresh, etc.).
 */
const AUTH_PATH_ALLOWLIST = ["auth/signin", "auth/signup", "auth/me"];

function is401ExemptPath(url: string): boolean {
	const normalized = url.replace(/^\/+/, "").replace(/[?#].*$/, "");
	return AUTH_PATH_ALLOWLIST.some((p) => normalized.endsWith(p));
}

export const http = ky.create({
	prefixUrl,
	timeout: 45_000,
	retry: 0,
	hooks: {
		beforeRequest: [
			(request) => {
				if (!request.headers.has("Content-Type")) {
					request.headers.set("Content-Type", "application/json");
				}
				// Attach Bearer token for every request — synchronous read from the
				// module mirror / localStorage (both are populated by Zustand persist).
				const token = getAuthTokenSync();
				if (token && !request.headers.has("Authorization")) {
					request.headers.set("Authorization", `Bearer ${token}`);
				}
			},
		],
		afterResponse: [
			(request, _options, response) => {
				if (response.status !== 401) return response;
				if (is401ExemptPath(request.url)) return response;
				// Session gone or token invalid — wipe state + punt to signin with a
				// returnTo so the user lands back where they were.
				if (typeof window !== "undefined") {
					const returnTo = encodeURIComponent(
						`${window.location.pathname}${window.location.search}`,
					);
					useAuthStore.getState().clearAuth();
					const onAuthPage = window.location.pathname.startsWith("/auth/");
					if (!onAuthPage) {
						window.location.assign(`/auth/signin?expired=1&returnTo=${returnTo}`);
					}
				}
				return response;
			},
		],
	},
});

export class ApiError<B = unknown> extends Error {
	status: number;
	body?: B;
	constructor(status: number, message: string, body?: B) {
		super(message);
		this.status = status;
		this.body = body;
		Object.setPrototypeOf(this, ApiError.prototype);
	}
}

type Method = "get" | "post" | "put" | "patch" | "delete";
type Options = Parameters<typeof http.get>[1];

/**
 * Make a request and validate the response against a zod schema.
 * Throws ApiError on network error, non-2xx, or shape mismatch.
 */
export async function apiRequest<TSchema extends ZodTypeAny>(
	method: Method,
	path: string,
	responseSchema: TSchema,
	options?: Options,
): Promise<z.infer<TSchema>> {
	const normalizedPath = path.replace(/^\/+/, "");
	try {
		const response = await http[method](normalizedPath, options);
		const raw: unknown = await response.json();
		const parsed = responseSchema.safeParse(raw);
		if (!parsed.success) {
			throw new ApiError(
				response.status,
				"Response did not match expected schema.",
				{ issues: parsed.error.issues, raw },
			);
		}
		return parsed.data as z.infer<TSchema>;
	} catch (error) {
		if (error instanceof ApiError) throw error;
		if (error instanceof HTTPError) {
			let body: unknown;
			try {
				body = await error.response.json();
			} catch {
				body = undefined;
			}
			const message =
				(body && typeof body === "object" && "message" in body
					? String((body as { message: unknown }).message)
					: undefined) ?? error.message;
			throw new ApiError(error.response.status, message, body);
		}
		throw new ApiError(0, error instanceof Error ? error.message : "Network error");
	}
}

export const api = {
	get: <T extends ZodTypeAny>(path: string, schema: T, options?: Options) =>
		apiRequest("get", path, schema, options),
	post: <T extends ZodTypeAny>(path: string, schema: T, options?: Options) =>
		apiRequest("post", path, schema, options),
	put: <T extends ZodTypeAny>(path: string, schema: T, options?: Options) =>
		apiRequest("put", path, schema, options),
	patch: <T extends ZodTypeAny>(path: string, schema: T, options?: Options) =>
		apiRequest("patch", path, schema, options),
	delete: <T extends ZodTypeAny>(path: string, schema: T, options?: Options) =>
		apiRequest("delete", path, schema, options),
};
