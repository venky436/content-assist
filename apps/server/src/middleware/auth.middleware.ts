import type { MiddlewareHandler } from "hono";
import { JWTError, verifyAuthToken } from "@server/services/auth";
import { logger } from "@server/lib/logger";

/**
 * Hono context variables injected by `authMiddleware`.
 * Consume via `c.get("user")` / `c.get("userId")` in handlers.
 */
export type AuthVariables = {
	user: { id: string; email: string };
	userId: string;
};

/** Use this as the Hono `Env` generic so handlers get typed `c.get(...)`. */
export type AppEnv = { Variables: AuthVariables };

function extractBearer(authHeader: string | undefined): string | null {
	if (!authHeader) return null;
	const match = /^Bearer\s+(\S+)$/i.exec(authHeader.trim());
	return match?.[1] ?? null;
}

/**
 * Reads `Authorization: Bearer <JWT>`, verifies, injects user + userId.
 * 401 on missing/invalid/expired.
 */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
	const token = extractBearer(c.req.header("authorization"));
	if (!token) {
		return c.json(
			{ error: "unauthorized", message: "Sign in to continue." },
			401,
		);
	}
	try {
		const payload = await verifyAuthToken(token);
		c.set("user", { id: payload.sub, email: payload.email });
		c.set("userId", payload.sub);
	} catch (err) {
		const code = err instanceof JWTError ? err.code : "invalid";
		logger.warn({
			msg: "auth: token rejected",
			code,
			error: err instanceof Error ? err.message : String(err),
		});
		const message =
			code === "expired"
				? "Session expired. Sign in again."
				: "Sign in to continue.";
		return c.json({ error: "unauthorized", message }, 401);
	}
	await next();
};
