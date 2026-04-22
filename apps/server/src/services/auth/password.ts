import bcrypt from "bcryptjs";

/** bcrypt cost factor. 10 ≈ 50–80ms/hash on a laptop — balanced for login UX. */
const BCRYPT_COST = 10;

export function hashPassword(plain: string): Promise<string> {
	return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
	return bcrypt.compare(plain, hash);
}
