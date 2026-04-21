import {
	generateScriptResponseSchema,
	type GenerateScriptRequest,
	type GenerateScriptResponse,
} from "@content-assist/shared";
import { api } from "@/lib/api-client";

export const scriptApi = {
	generate: (body: GenerateScriptRequest): Promise<GenerateScriptResponse> =>
		api.post("/generate/script", generateScriptResponseSchema, { json: body }),
};
