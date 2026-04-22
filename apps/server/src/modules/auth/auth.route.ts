import { OpenAPIHono } from "@hono/zod-openapi";
import {
	authMiddleware,
	type AppEnv,
} from "@server/middleware/auth.middleware";
import { clientIp, createLimiter } from "@server/services/rate-limit";
import {
	meHandler,
	signInHandler,
	signOutHandler,
	signUpHandler,
} from "@server/modules/auth/auth.handler";
import {
	meRoute,
	signInRoute,
	signOutRoute,
	signUpRoute,
} from "@server/modules/auth/auth.schema";

const auth = new OpenAPIHono<AppEnv>();

// Rate limits. IP-based on signup/signin (brute-force + spam guard).
const signupLimiter = createLimiter({
	keyFn: (c) => `signup:${clientIp(c)}`,
	limit: 3,
	windowMs: 60 * 60 * 1000, // 1h
	tag: "auth.signup",
});
const signinLimiter = createLimiter({
	keyFn: (c) => `signin:${clientIp(c)}`,
	limit: 5,
	windowMs: 15 * 60 * 1000, // 15m
	tag: "auth.signin",
});

auth.use("/signup", signupLimiter);
auth.use("/signin", signinLimiter);
// /me + /signout require a valid token.
auth.use("/me", authMiddleware);
auth.use("/signout", authMiddleware);

auth.openapi(signUpRoute, signUpHandler);
auth.openapi(signInRoute, signInHandler);
auth.openapi(meRoute, meHandler);
auth.openapi(signOutRoute, signOutHandler);

export { auth };
