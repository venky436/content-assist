"use client";

import { useMutation } from "@tanstack/react-query";
import type { IngestResponse } from "@content-assist/shared";
import { ingestApi } from "./api";

/**
 * One mutation per ingest kind. IngestPanel picks the right hook based on
 * its `mode` prop and exposes `mutate(file)` to the UI.
 */

export function useIngestVideo() {
	return useMutation<IngestResponse, Error, File>({
		mutationFn: (file) => ingestApi.video(file),
	});
}

export function useIngestImage() {
	return useMutation<IngestResponse, Error, File>({
		mutationFn: (file) => ingestApi.image(file),
	});
}
