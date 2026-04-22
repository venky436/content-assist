import { cors } from "hono/cors";

export const corsMiddleware = cors({
	origin: (origin) => {
		if (!origin) return "*";
		if (/^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/.test(origin)) {
			return origin;
		}
		if (/^https?:\/\/(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))\.\d+\.\d+(:\d+)?$/.test(origin)) {
			return origin;
		}
		if (/^exp:\/\//.test(origin)) return origin;
		return origin;
	},
	allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowHeaders: ["Content-Type", "Authorization"],
	maxAge: 86400,
});
