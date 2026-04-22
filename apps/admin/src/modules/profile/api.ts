import { z } from "zod";
import {
	confirmUploadResponseSchema,
	listMediaResponseSchema,
	mediaAssetSchema,
	presignResponseSchema,
	profileResponseSchema,
	type ConfirmUploadRequest,
	type ConfirmUploadResponse,
	type ListMediaRequest,
	type ListMediaResponse,
	type MediaAsset,
	type PresignRequest,
	type PresignResponse,
	type Profile,
	type ProfileResponse,
	type UpdateMediaRequest,
	type UpdateProfileRequest,
} from "@content-assist/shared";
import { api } from "@/lib/api-client";

const singleAssetSchema = z.object({ asset: mediaAssetSchema });
const okSchema = z.object({ ok: z.literal(true) });

export const profileApi = {
	getProfile: (): Promise<ProfileResponse> =>
		api.get("/profile", profileResponseSchema),

	updateProfile: (body: UpdateProfileRequest): Promise<ProfileResponse> =>
		api.patch("/profile", profileResponseSchema, { json: body }),

	presign: (body: PresignRequest): Promise<PresignResponse> =>
		api.post("/uploads/presign", presignResponseSchema, { json: body }),

	confirm: (body: ConfirmUploadRequest): Promise<ConfirmUploadResponse> =>
		api.post("/uploads/confirm", confirmUploadResponseSchema, { json: body }),

	listMedia: (query: ListMediaRequest): Promise<ListMediaResponse> => {
		const params = new URLSearchParams();
		if (query.kind) params.set("kind", query.kind);
		if (query.cursor) params.set("cursor", query.cursor);
		if (query.limit) params.set("limit", String(query.limit));
		const qs = params.toString();
		return api.get(`/media${qs ? `?${qs}` : ""}`, listMediaResponseSchema);
	},

	updateMedia: (id: string, body: UpdateMediaRequest): Promise<{ asset: MediaAsset }> =>
		api.patch(`/media/${id}`, singleAssetSchema, { json: body }),

	deleteMedia: (id: string): Promise<{ ok: true }> =>
		api.delete(`/media/${id}`, okSchema),
};

export type { Profile, MediaAsset };
