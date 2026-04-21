import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type {
	GenerateScriptRequest,
	GenerateScriptResponse,
} from "@content-assist/shared";
import { scriptApi } from "./api";

export function useGenerateScript(
	options?: UseMutationOptions<GenerateScriptResponse, Error, GenerateScriptRequest>,
) {
	return useMutation<GenerateScriptResponse, Error, GenerateScriptRequest>({
		mutationFn: (req) => scriptApi.generate(req),
		...options,
	});
}
