import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

export type DownloadResult =
	| { ok: true }
	| { ok: false; reason: "permission_denied" | "download_failed" | "save_failed" };

/**
 * Download an MP4 URL and save it to the device's camera roll.
 * Prompts for MediaLibrary permission on first use.
 */
export async function downloadVideoToGallery(
	url: string,
): Promise<DownloadResult> {
	const perm = await MediaLibrary.requestPermissionsAsync();
	if (!perm.granted) return { ok: false, reason: "permission_denied" };

	const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
	if (!dir) return { ok: false, reason: "download_failed" };
	const fileUri = `${dir}contentassist-${Date.now()}.mp4`;

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
