import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { AnalyzeRequest, AnalyzeResponse } from "@content-assist/shared";
import { analyzeApi } from "./api";

export function useAnalyze(
	options?: UseMutationOptions<AnalyzeResponse, Error, AnalyzeRequest>,
) {
	return useMutation<AnalyzeResponse, Error, AnalyzeRequest>({
		mutationFn: (req) => analyzeApi.analyze(req),
		...options,
	});
}
