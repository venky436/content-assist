import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type {
	GenerateImagesRequest,
	GenerateImagesResponse,
} from "@content-assist/shared";
import { imagesApi } from "./api";

export function useGenerateImages(
	options?: UseMutationOptions<GenerateImagesResponse, Error, GenerateImagesRequest>,
) {
	return useMutation<GenerateImagesResponse, Error, GenerateImagesRequest>({
		mutationFn: (req) => imagesApi.regenerate(req),
		...options,
	});
}
