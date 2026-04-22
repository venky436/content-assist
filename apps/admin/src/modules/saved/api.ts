import { z } from "zod";
import {
	listSavedPostsResponseSchema,
	savedPostRequestSchema,
	savedPostResponseSchema,
	type ListSavedPostsResponse,
	type SavedPost,
	type SavedPostSource,
} from "@content-assist/shared";
import { api } from "@/lib/api-client";

/** Server response for list — items are passthrough so we assert the shape on read. */

export const savedPostsApi = {
	list: (query: {
		source?: SavedPostSource;
		cursor?: string;
		limit?: number;
	} = {}): Promise<ListSavedPostsResponse> => {
		const params = new URLSearchParams();
		if (query.source) params.set("source", query.source);
		if (query.cursor) params.set("cursor", query.cursor);
		if (query.limit) params.set("limit", String(query.limit));
		const qs = params.toString();
		return api.get(
			`/saved${qs ? `?${qs}` : ""}`,
			listSavedPostsResponseSchema,
		) as Promise<ListSavedPostsResponse>;
	},

	get: async (id: string): Promise<SavedPost | null> => {
		try {
			const data = await api.get(`/saved/${id}`, savedPostResponseSchema);
			return data.post as SavedPost;
		} catch (err) {
			// 404 → null (matches the old localStorage contract).
			if (
				err &&
				typeof err === "object" &&
				"status" in err &&
				(err as { status?: number }).status === 404
			) {
				return null;
			}
			throw err;
		}
	},

	create: async (
		draft: Omit<SavedPost, "id" | "createdAt" | "updatedAt"> &
			Partial<Pick<SavedPost, "id" | "createdAt" | "updatedAt">>,
	): Promise<SavedPost> => {
		const body = savedPostRequestSchema.parse(draft);
		const data = await api.post("/saved", savedPostResponseSchema, {
			json: body,
		});
		return data.post as SavedPost;
	},

	delete: (id: string): Promise<{ ok: true }> =>
		api.delete(`/saved/${id}`, z.object({ ok: z.literal(true) })),
};
