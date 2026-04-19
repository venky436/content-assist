import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

export type DownloadResult =
	| { ok: true }
	| { ok: false; reason: "permission_denied" | "download_failed" | "save_failed" };

/**
 * Download an image URL and save it to the device's photo library.
 * Prompts for MediaLibrary permission on first use.
 */
export async function downloadImageToGallery(
	url: string,
): Promise<DownloadResult> {
	// 1. Ask for permission
	const perm = await MediaLibrary.requestPermissionsAsync();
	if (!perm.granted) {
		return { ok: false, reason: "permission_denied" };
	}

	// 2. Pick a reasonable extension (webp from replicate; fall back to jpg)
	const urlLower = url.toLowerCase();
	let ext = "jpg";
	if (urlLower.includes(".webp")) ext = "webp";
	else if (urlLower.includes(".png")) ext = "png";

	const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
	if (!dir) return { ok: false, reason: "download_failed" };
	const fileUri = `${dir}contentassist-${Date.now()}.${ext}`;

	try {
		const { uri } = await FileSystem.downloadAsync(url, fileUri);
		try {
			await MediaLibrary.saveToLibraryAsync(uri);
			return { ok: true };
		} catch {
			return { ok: false, reason: "save_failed" };
		}
	} catch {
		return { ok: false, reason: "download_failed" };
	}
}
