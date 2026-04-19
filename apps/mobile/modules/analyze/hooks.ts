import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { AnalyzeRequest, AnalyzeResponse } from "@content-assist/shared";
import type { ApiError } from "@mobile/lib/api-client";
import { analyzeApi } from "./api";

export function useAnalyze(
	options?: UseMutationOptions<AnalyzeResponse, ApiError, AnalyzeRequest>,
) {
	return useMutation<AnalyzeResponse, ApiError, AnalyzeRequest>({
		mutationFn: (req) => analyzeApi.analyze(req),
		...options,
	});
}
