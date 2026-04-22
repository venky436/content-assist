import {
	ingestResponseSchema,
	type IngestResponse,
} from "@content-assist/shared";
import { ApiError } from "@/lib/api-client";
import { getAuthTokenSync, useAuthStore } from "@/stores/auth-store";

const PREFIX =
	process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ??
	"http://localhost:3000";

/**
 * Multipart upload helper. We don't route through the shared `api` ky wrapper
 * because that wrapper always sets `Content-Type: application/json`, which
 * strips the multipart boundary. `fetch` + a manual Bearer header gets the
 * job done; we still reuse the 401 handling by clearing auth on unauthorized.
 */
async function uploadMultipart(
	path: string,
	file: File,
): Promise<IngestResponse> {
	const fd = new FormData();
	fd.append("file", file);

	const token = getAuthTokenSync();
	const url = `${PREFIX}${path}`;

	let response: Response;
	try {
		response = await fetch(url, {
			method: "POST",
			body: fd,
			headers: token ? { Authorization: `Bearer ${token}` } : undefined,
		});
	} catch (err) {
		throw new ApiError(
			0,
			err instanceof Error ? err.message : "Network error while uploading.",
		);
	}

	if (response.status === 401) {
		// Same semantics as the shared api-client: clear + punt to signin.
		if (typeof window !== "undefined") {
			const returnTo = encodeURIComponent(
				`${window.location.pathname}${window.location.search}`,
			);
			useAuthStore.getState().clearAuth();
			window.location.assign(`/auth/signin?expired=1&returnTo=${returnTo}`);
		}
		throw new ApiError(401, "Session expired");
	}

	let body: unknown = null;
	try {
		body = await response.json();
	} catch {
		// ignore — body may be empty on some error codes
	}

	if (!response.ok) {
		const message =
			body &&
			typeof body === "object" &&
			"message" in body &&
			typeof (body as { message: unknown }).message === "string"
				? (body as { message: string }).message
				: `Ingest failed (${response.status})`;
		throw new ApiError(response.status, message, body);
	}

	const parsed = ingestResponseSchema.safeParse(body);
	if (!parsed.success) {
		throw new ApiError(response.status, "Unexpected ingest response shape", {
			issues: parsed.error.issues,
		});
	}
	return parsed.data;
}

export const ingestApi = {
	video: (file: File) => uploadMultipart("/ingest/video", file),
	image: (file: File) => uploadMultipart("/ingest/image", file),
};

export type { IngestResponse };
