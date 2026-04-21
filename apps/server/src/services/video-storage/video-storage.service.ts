import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { logger } from "@server/lib/logger";

const VIDEO_DIR = path.join(os.tmpdir(), "content-assist-videos");
const TTL_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes

async function ensureDir(): Promise<void> {
	await mkdir(VIDEO_DIR, { recursive: true });
}

export function getVideoPath(id: string): string {
	// id is a slug-safe string; guard against path traversal just in case.
	const safe = id.replace(/[^a-zA-Z0-9_-]/g, "");
	return path.join(VIDEO_DIR, `${safe}.mp4`);
}

export async function reserveVideoPath(id: string): Promise<string> {
	await ensureDir();
	return getVideoPath(id);
}

async function cleanupOnce(): Promise<void> {
	try {
		await ensureDir();
		const entries = await readdir(VIDEO_DIR);
		const now = Date.now();
		let deleted = 0;
		for (const entry of entries) {
			if (!entry.endsWith(".mp4")) continue;
			const full = path.join(VIDEO_DIR, entry);
			try {
				const s = await stat(full);
				if (now - s.mtimeMs > TTL_MS) {
					await unlink(full);
					deleted++;
				}
			} catch {}
		}
		if (deleted > 0) {
			logger.info({ msg: "video-storage: cleanup", deleted });
		}
	} catch (err) {
		logger.warn({
			msg: "video-storage: cleanup failed",
			error: err instanceof Error ? err.message : String(err),
		});
	}
}

let cleanupTimer: NodeJS.Timeout | null = null;

export function startVideoCleanup(): void {
	if (cleanupTimer) return;
	// Run once on boot, then on the interval.
	cleanupOnce();
	cleanupTimer = setInterval(cleanupOnce, CLEANUP_INTERVAL_MS);
	if (typeof cleanupTimer.unref === "function") cleanupTimer.unref();
}

export function stopVideoCleanup(): void {
	if (cleanupTimer) {
		clearInterval(cleanupTimer);
		cleanupTimer = null;
	}
}

export { VIDEO_DIR };
