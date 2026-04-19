import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type {
	GenerateRequest,
	GenerateResponse,
	HooksOnlyRequest,
	HooksOnlyResponse,
} from "@content-assist/shared";
import { generateApi } from "./api";

export function useGenerate(
	options?: UseMutationOptions<GenerateResponse, Error, GenerateRequest>,
) {
	return useMutation<GenerateResponse, Error, GenerateRequest>({
		mutationFn: (req) => generateApi.generate(req),
		...options,
	});
}

export function useRegenerateHooks(
	options?: UseMutationOptions<HooksOnlyResponse, Error, HooksOnlyRequest>,
) {
	return useMutation<HooksOnlyResponse, Error, HooksOnlyRequest>({
		mutationFn: (req) => generateApi.regenerateHooks(req),
		...options,
	});
}
