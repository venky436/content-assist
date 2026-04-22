"use client";

import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type {
	ListMediaResponse,
	MediaAsset,
	MediaKind,
	ProfileResponse,
	UpdateMediaRequest,
	UpdateProfileRequest,
} from "@content-assist/shared";
import { profileApi } from "./api";

/**
 * Hooks handle cache management only. Callers that need per-call side-effects
 * should pass `onSuccess`/`onError` to `mutate(vars, { onSuccess })` at the
 * call site — keeps the hook signatures simple and avoids fighting react-query
 * v5's evolving callback arities.
 */

const PROFILE_KEY = ["profile"] as const;
const MEDIA_KEY = (kind?: string) =>
	kind ? ["media", kind] : (["media"] as const);

export function useProfile() {
	return useQuery({
		queryKey: PROFILE_KEY,
		queryFn: () => profileApi.getProfile(),
		staleTime: 30_000,
	});
}

export function useUpdateProfile() {
	const qc = useQueryClient();
	return useMutation<ProfileResponse, Error, UpdateProfileRequest>({
		mutationFn: (req) => profileApi.updateProfile(req),
		onSuccess: (data) => {
			qc.setQueryData(PROFILE_KEY, data);
		},
	});
}

export function useMediaList(query: { kind?: MediaKind; cursor?: string; limit?: number }) {
	return useQuery({
		queryKey: MEDIA_KEY(query.kind),
		queryFn: () =>
			profileApi.listMedia({
				kind: query.kind,
				cursor: query.cursor,
				limit: query.limit ?? 24,
			}),
		staleTime: 30_000,
	});
}

export function useDeleteMedia() {
	const qc = useQueryClient();
	return useMutation<{ ok: true }, Error, { id: string; kind?: string }>({
		mutationFn: ({ id }) => profileApi.deleteMedia(id),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: MEDIA_KEY(vars.kind) });
		},
	});
}

export function useUpdateMedia() {
	const qc = useQueryClient();
	return useMutation<
		{ asset: MediaAsset },
		Error,
		{ id: string; kind?: string; patch: UpdateMediaRequest }
	>({
		mutationFn: ({ id, patch }) => profileApi.updateMedia(id, patch),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: MEDIA_KEY(vars.kind) });
		},
	});
}

/** Manually nudge the profile cache (after an avatar/cover upload). */
export function useInvalidateProfile() {
	const qc = useQueryClient();
	return () => qc.invalidateQueries({ queryKey: PROFILE_KEY });
}

export { MEDIA_KEY, PROFILE_KEY };
export type { ListMediaResponse };
