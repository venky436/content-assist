"use client";

import { useCallback, useRef, useState } from "react";
import type {
	ConfirmUploadResponse,
	UploadKind,
} from "@content-assist/shared";
import { profileApi } from "./api";

/**
 * Orchestrates the 3-step upload dance:
 *   1. POST /uploads/presign  → { uploadUrl, objectKey, ... }
 *   2. PUT file to S3 (direct, with XHR so we get progress events)
 *   3. POST /uploads/confirm  → final asset metadata
 *
 * Returns observable state (`progress`, `status`, `error`) so UIs can paint
 * a progress ring, an uploading label, and a success/failure toast.
 *
 * `upload()` resolves to the confirm response on success, or throws.
 */
export type UploadStatus = "idle" | "presigning" | "uploading" | "confirming" | "done" | "error";

export type UploadOptions = {
	/** Client-measured image dimensions — forwarded to confirm. */
	width?: number;
	height?: number;
	/** Client-measured audio duration (sec) — forwarded to confirm. */
	durationSec?: number;
	/** Optional display name for media library items (unused for avatar/cover). */
	name?: string;
	/** Optional tags. */
	tags?: string[];
};

export function useUpload() {
	const [status, setStatus] = useState<UploadStatus>("idle");
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const xhrRef = useRef<XMLHttpRequest | null>(null);

	const reset = useCallback(() => {
		setStatus("idle");
		setProgress(0);
		setError(null);
	}, []);

	const cancel = useCallback(() => {
		xhrRef.current?.abort();
		xhrRef.current = null;
		setStatus("idle");
		setProgress(0);
	}, []);

	const upload = useCallback(
		async (
			kind: UploadKind,
			file: File,
			opts: UploadOptions = {},
		): Promise<ConfirmUploadResponse> => {
			setError(null);
			setProgress(0);
			setStatus("presigning");

			try {
				// 1. Get a presigned PUT URL from the server.
				const presign = await profileApi.presign({
					kind,
					mime: file.type || "application/octet-stream",
					sizeBytes: file.size,
					filename: file.name,
				});

				// 2. PUT direct to S3. We use XHR (not fetch) because fetch doesn't
				//    expose upload progress.
				setStatus("uploading");
				await new Promise<void>((resolve, reject) => {
					const xhr = new XMLHttpRequest();
					xhrRef.current = xhr;
					xhr.open("PUT", presign.uploadUrl, true);
					xhr.setRequestHeader("Content-Type", presign.contentType);
					xhr.upload.onprogress = (e) => {
						if (e.lengthComputable) {
							setProgress(Math.round((e.loaded / e.total) * 100));
						}
					};
					xhr.onload = () => {
						xhrRef.current = null;
						if (xhr.status >= 200 && xhr.status < 300) resolve();
						else reject(new Error(`S3 upload failed (${xhr.status})`));
					};
					xhr.onerror = () => {
						xhrRef.current = null;
						reject(new Error("Network error during upload"));
					};
					xhr.onabort = () => {
						xhrRef.current = null;
						reject(new Error("Upload cancelled"));
					};
					xhr.send(file);
				});
				setProgress(100);

				// 3. Tell the server we're done so it verifies + inserts the row.
				setStatus("confirming");
				const confirmed = await profileApi.confirm({
					objectKey: presign.objectKey,
					kind,
					name: opts.name ?? file.name.replace(/\.[^.]+$/, ""),
					width: opts.width,
					height: opts.height,
					durationSec: opts.durationSec,
					tags: opts.tags,
				});

				setStatus("done");
				return confirmed;
			} catch (err) {
				const msg = err instanceof Error ? err.message : "Upload failed";
				setError(msg);
				setStatus("error");
				throw err;
			}
		},
		[],
	);

	return { upload, cancel, reset, status, progress, error };
}

/**
 * Probe an image file for natural dimensions before upload — so we can hand
 * width/height to the confirm endpoint and store them in metadata.
 */
export function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
	return new Promise((resolve) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
			URL.revokeObjectURL(url);
		};
		img.onerror = () => {
			resolve(null);
			URL.revokeObjectURL(url);
		};
		img.src = url;
	});
}

/**
 * Probe an audio file for duration using HTMLAudioElement — fast, no decode
 * needed beyond metadata.
 */
export function readAudioDuration(file: File): Promise<number | null> {
	return new Promise((resolve) => {
		const url = URL.createObjectURL(file);
		const audio = document.createElement("audio");
		audio.preload = "metadata";
		audio.onloadedmetadata = () => {
			resolve(
				Number.isFinite(audio.duration) ? Math.round(audio.duration) : null,
			);
			URL.revokeObjectURL(url);
		};
		audio.onerror = () => {
			resolve(null);
			URL.revokeObjectURL(url);
		};
		audio.src = url;
	});
}
