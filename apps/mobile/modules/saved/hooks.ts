import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SavedPost } from "@content-assist/shared";
import { savedPostsService } from "./service";

const LIST_KEY = ["savedPosts"] as const;
const detailKey = (id: string) => ["savedPost", id] as const;

export function useSavedPosts() {
	return useQuery({
		queryKey: LIST_KEY,
		queryFn: () => savedPostsService.list(),
		staleTime: 0,
	});
}

export function useSavedPost(id: string | undefined) {
	return useQuery({
		queryKey: id ? detailKey(id) : ["savedPost", "missing"],
		queryFn: () => (id ? savedPostsService.get(id) : Promise.resolve(null)),
		enabled: Boolean(id),
		staleTime: 0,
	});
}

export function useSavePost() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (draft: Omit<SavedPost, "id" | "createdAt" | "updatedAt">) =>
			savedPostsService.save(draft),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: LIST_KEY });
		},
	});
}

export function useUpdateSavedPost() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			patch,
		}: {
			id: string;
			patch: Partial<Omit<SavedPost, "id" | "createdAt">>;
		}) => savedPostsService.update(id, patch),
		onSuccess: (data) => {
			qc.invalidateQueries({ queryKey: LIST_KEY });
			if (data) qc.invalidateQueries({ queryKey: detailKey(data.id) });
		},
	});
}

export function useDeleteSavedPost() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => savedPostsService.remove(id),
		onSuccess: (_, id) => {
			qc.invalidateQueries({ queryKey: LIST_KEY });
			qc.removeQueries({ queryKey: detailKey(id) });
		},
	});
}
