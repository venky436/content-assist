import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { logger } from "@server/lib/logger";
import { mediaRepo } from "@server/services/profile";
import { storage } from "@server/services/storage";

/**
 * Fetch a user-uploaded audio track from S3 to a local tmp file so the
 * ffmpeg composer can read it as BGM. Returns the path + a cleanup fn.
 *
 * Ownership is enforced here — the objectKey must belong to the given user
 * and be `kind: audio` in the media library. Cross-user or non-existent
 * keys raise `ForbiddenCustomBgmError`, which the route translates to 403.
 *
 * Keeps a parity with `resolveBgmPath(tone)` so the video handler can
 * treat preset + custom BGM interchangeably: both reduce to a local path.
 */

export type ResolvedCustomBgm = {
	path: string;
	cleanup: () => Promise<void>;
};

export class ForbiddenCustomBgmError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ForbiddenCustomBgmError";
	}
}

export async function resolveCustomBgm(
	objectKey: string,
	userId: string,
): Promise<ResolvedCustomBgm> {
	// 1. Ownership check via the media repo. We require kind=audio so someone
	//    can't pass an image key (server would still fail later, but a clear
	//    403 beats a cryptic ffmpeg error).
	const asset = await mediaRepo.findByObjectKeyForUser(objectKey, userId, "audio");
	if (!asset) {
		throw new ForbiddenCustomBgmError(
			"Custom BGM audio not found or does not belong to the user.",
		);
	}

	// 2. Short-lived presigned GET — the URL lives just long enough to fetch.
	const { url } = await storage.presignGet({
		key: asset.objectKey,
		ttlSec: 2 * 60,
	});

	// 3. Fetch + write to tmp. Scratch dir is unique per resolution so parallel
	//    requests can't stomp each other.
	const scratchDir = path.join(tmpdir(), "cav-bgm");
	await mkdir(scratchDir, { recursive: true });
	const ext = (asset.mime === "audio/mpeg" ? "mp3" : inferExtFromMime(asset.mime)) ?? "mp3";
	const localPath = path.join(scratchDir, `${randomUUID()}.${ext}`);

	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Custom BGM download failed (HTTP ${res.status})`);
	}
	const buf = Buffer.from(await res.arrayBuffer());
	await writeFile(localPath, buf);

	logger.info({
		msg: "bgm.custom: downloaded",
		userId,
		objectKey: asset.objectKey,
		bytes: buf.byteLength,
		path: localPath,
	});

	return {
		path: localPath,
		cleanup: async () => {
			try {
				await rm(localPath, { force: true });
			} catch (err) {
				logger.warn({
					msg: "bgm.custom: cleanup failed",
					path: localPath,
					error: err instanceof Error ? err.message : String(err),
				});
			}
		},
	};
}

function inferExtFromMime(mime: string): string | null {
	if (mime === "audio/mpeg" || mime === "audio/mp3") return "mp3";
	if (mime === "audio/wav" || mime === "audio/x-wav") return "wav";
	if (mime === "audio/mp4" || mime === "audio/aac") return "m4a";
	if (mime === "audio/ogg") return "ogg";
	return null;
}
