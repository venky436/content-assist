import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { config } from "@server/config";

const ALG = "HS256";
const secret = new TextEncoder().encode(config.jwtSecret);

export type AuthTokenPayload = JWTPayload & {
	sub: string;
	email: string;
};

export class JWTError extends Error {
	public readonly code: "invalid" | "expired";
	constructor(message: string, code: "invalid" | "expired") {
		super(message);
		this.name = "JWTError";
		this.code = code;
	}
}

/** Sign an access token. Sets `sub = userId`, `email`, `iat`, `exp`. */
export async function signAuthToken(input: {
	userId: string;
	email: string;
}): Promise<string> {
	return new SignJWT({ email: input.email })
		.setProtectedHeader({ alg: ALG })
		.setSubject(input.userId)
		.setIssuedAt()
		.setExpirationTime(config.jwtExpiresIn)
		.sign(secret);
}

/** Verify + decode an access token. Throws JWTError on failure. */
export async function verifyAuthToken(token: string): Promise<AuthTokenPayload> {
	try {
		const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
		if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
			throw new JWTError("Token payload missing required fields", "invalid");
		}
		return payload as AuthTokenPayload;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (/expired/i.test(msg)) throw new JWTError(msg, "expired");
		if (err instanceof JWTError) throw err;
		throw new JWTError(msg, "invalid");
	}
}
