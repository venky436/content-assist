import type { Context, MiddlewareHandler } from "hono";
import { config } from "@server/config";
import { logger } from "@server/lib/logger";

type Bucket = {
	count: number;
	resetAt: number; // epoch ms
};

const store = new Map<string, Bucket>();

function getOrCreateBucket(key: string, windowMs: number): Bucket {
	const now = Date.now();
	const existing = store.get(key);
	if (!existing || existing.resetAt <= now) {
		const fresh: Bucket = { count: 0, resetAt: now + windowMs };
		store.set(key, fresh);
		return fresh;
	}
	return existing;
}

/** Best-effort client IP. Honest: spoofable unless behind a trusted proxy. */
export function clientIp(c: Context): string {
	const xff = c.req.header("x-forwarded-for");
	if (xff) {
		const first = xff.split(",")[0]?.trim();
		if (first) return first;
	}
	return c.req.header("x-real-ip") ?? "unknown";
}

type LimiterConfig = {
	/** Function deriving the bucket key from the request. */
	keyFn: (c: Context) => string;
	/** Max requests per window. */
	limit: number;
	/** Window length in ms. */
	windowMs: number;
	/** Optional custom tag for logs. */
	tag?: string;
};

/**
 * Create a Hono middleware that enforces a sliding-window rate limit.
 *
 * Limits reset on server restart + don't span instances (in-memory).
 * When we scale past one box, swap `store` for Redis — the interface stays identical.
 */
export function createLimiter(cfg: LimiterConfig): MiddlewareHandler {
	return async (c, next) => {
		// Dev mode: short-circuit. Repeatedly signing in / generating while
		// building the UI would otherwise trip the limits constantly.
		if (config.isDev) {
			await next();
			return;
		}
		const key = cfg.keyFn(c);
		const bucket = getOrCreateBucket(key, cfg.windowMs);
		bucket.count += 1;
		if (bucket.count > cfg.limit) {
			const retryAfterSec = Math.max(
				1,
				Math.ceil((bucket.resetAt - Date.now()) / 1000),
			);
			logger.warn({
				msg: "rate-limit: blocked",
				tag: cfg.tag ?? "default",
				key,
				count: bucket.count,
				limit: cfg.limit,
				retryAfterSec,
			});
			c.header("Retry-After", String(retryAfterSec));
			return c.json(
				{
					error: "rate_limited",
					message: `Too many attempts. Try again in ${retryAfterSec}s.`,
					retryAfterSec,
				},
				429,
			);
		}
		await next();
	};
}

/** For test cleanup. Not used in production. */
export function _resetRateLimitStore(): void {
	store.clear();
}
