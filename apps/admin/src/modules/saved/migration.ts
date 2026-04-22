import type { SavedPost } from "@content-assist/shared";
import { savedPostsApi } from "./api";

const LEGACY_KEY = "contentassist:saved_posts";
const MIGRATED_FLAG = "contentassist:saved_migrated";

/**
 * One-time migration: take whatever lives in `localStorage["contentassist:saved_posts"]`
 * from the pre-server days and push it up to the new `/saved` endpoint. Legacy
 * posts have expired Replicate URLs + dead local-disk video URLs — migration
 * succeeds but nested media can't render. The text content (hooks, caption,
 * hashtags, script) survives intact.
 *
 * Runs once per signed-in browser. A flag in localStorage prevents re-runs.
 */
export async function migrateLocalStorageSavedPosts(): Promise<{
	migrated: number;
	skipped: number;
}> {
	if (typeof window === "undefined")
		return { migrated: 0, skipped: 0 };
	if (window.localStorage.getItem(MIGRATED_FLAG)) {
		return { migrated: 0, skipped: 0 };
	}
	const raw = window.localStorage.getItem(LEGACY_KEY);
	if (!raw) {
		window.localStorage.setItem(MIGRATED_FLAG, "1");
		return { migrated: 0, skipped: 0 };
	}
	let posts: SavedPost[];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) throw new Error("not an array");
		posts = parsed as SavedPost[];
	} catch {
		// Corrupt JSON — give up on migration but clear the bad payload so
		// we don't re-read it every boot.
		window.localStorage.removeItem(LEGACY_KEY);
		window.localStorage.setItem(MIGRATED_FLAG, "1");
		return { migrated: 0, skipped: 0 };
	}

	let migrated = 0;
	let skipped = 0;
	for (const post of posts) {
		try {
			await savedPostsApi.create(post);
			migrated++;
		} catch {
			skipped++;
		}
	}
	window.localStorage.removeItem(LEGACY_KEY);
	window.localStorage.setItem(MIGRATED_FLAG, "1");
	return { migrated, skipped };
}
