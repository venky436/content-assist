import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type {
	GenerateImagesRequest,
	GenerateImagesResponse,
} from "@content-assist/shared";
import type { ApiError } from "@mobile/lib/api-client";
import { imagesApi } from "./api";

export function useGenerateImages(
	options?: UseMutationOptions<
		GenerateImagesResponse,
		ApiError,
		GenerateImagesRequest
	>,
) {
	return useMutation<GenerateImagesResponse, ApiError, GenerateImagesRequest>({
		mutationFn: (req) =>
			req.modifier ? imagesApi.regenerate(req) : imagesApi.generate(req),
		...options,
	});
}
