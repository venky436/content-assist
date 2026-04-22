"use client";

import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationOptions,
} from "@tanstack/react-query";
import type { SavedPost } from "@content-assist/shared";
import { savedPostsApi } from "./api";

const LIST_KEY = ["saved-posts"] as const;
const DETAIL_KEY = (id?: string) => ["saved-post", id] as const;

/** Paginated list. For now we load the first page only — callers that need
 * more can switch to `useInfiniteQuery` when the library grows. */
export function useSavedPostsList() {
	return useQuery({
		queryKey: LIST_KEY,
		queryFn: async () => {
			const data = await savedPostsApi.list({ limit: 60 });
			// Return just the items — the old consumer expects a flat SavedPost[].
			return data.items as unknown as SavedPost[];
		},
		staleTime: 15_000,
	});
}

export function useSavedPost(id: string | undefined) {
	return useQuery({
		queryKey: DETAIL_KEY(id),
		queryFn: () => (id ? savedPostsApi.get(id) : null),
		enabled: Boolean(id),
		staleTime: 15_000,
	});
}

export function useSavePost(
	options?: UseMutationOptions<
		SavedPost,
		Error,
		Omit<SavedPost, "id" | "createdAt" | "updatedAt">
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (draft) => savedPostsApi.create(draft),
		onSuccess: (post) => {
			qc.invalidateQueries({ queryKey: LIST_KEY });
			qc.setQueryData(DETAIL_KEY(post.id), post);
		},
		...options,
	});
}

export function useDeleteSavedPost() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await savedPostsApi.delete(id);
			return id;
		},
		onSuccess: (id) => {
			qc.invalidateQueries({ queryKey: LIST_KEY });
			qc.removeQueries({ queryKey: DETAIL_KEY(id) });
		},
	});
}
