"use client";

import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationOptions,
} from "@tanstack/react-query";
import type { SavedPost } from "@content-assist/shared";
import { savedPostsService } from "./service";

const LIST_KEY = ["saved-posts"] as const;
const DETAIL_KEY = (id?: string) => ["saved-post", id] as const;

export function useSavedPostsList() {
	return useQuery({
		queryKey: LIST_KEY,
		queryFn: () => savedPostsService.list(),
		staleTime: 0,
	});
}

export function useSavedPost(id: string | undefined) {
	return useQuery({
		queryKey: DETAIL_KEY(id),
		queryFn: () => (id ? savedPostsService.get(id) : null),
		enabled: Boolean(id),
		staleTime: 0,
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
		mutationFn: async (draft) => savedPostsService.save(draft),
		onSuccess: (post) => {
			qc.invalidateQueries({ queryKey: LIST_KEY });
			qc.setQueryData(DETAIL_KEY(post.id), post);
		},
		...options,
	});
}

export function useUpdateSavedPost() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (args: {
			id: string;
			patch: Partial<Omit<SavedPost, "id" | "createdAt">>;
		}) => savedPostsService.update(args.id, args.patch),
		onSuccess: (post) => {
			if (!post) return;
			qc.invalidateQueries({ queryKey: LIST_KEY });
			qc.setQueryData(DETAIL_KEY(post.id), post);
		},
	});
}

export function useDeleteSavedPost() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			savedPostsService.remove(id);
			return id;
		},
		onSuccess: (id) => {
			qc.invalidateQueries({ queryKey: LIST_KEY });
			qc.removeQueries({ queryKey: DETAIL_KEY(id) });
		},
	});
}
