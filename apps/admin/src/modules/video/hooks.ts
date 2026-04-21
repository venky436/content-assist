import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type {
	GenerateVideoRequest,
	GenerateVideoResponse,
} from "@content-assist/shared";
import { videoApi } from "./api";

export function useGenerateVideo(
	options?: UseMutationOptions<GenerateVideoResponse, Error, GenerateVideoRequest>,
) {
	return useMutation<GenerateVideoResponse, Error, GenerateVideoRequest>({
		mutationFn: (req) => videoApi.generate(req),
		...options,
	});
}
