import {
	generateResponseSchema,
	generateScriptResponseSchema,
	hooksOnlyResponseSchema,
	type GenerateRequest,
	type GenerateResponse,
	type GenerateScriptRequest,
	type GenerateScriptResponse,
	type HooksOnlyRequest,
	type HooksOnlyResponse,
} from "@content-assist/shared";
import { api } from "@mobile/lib/api-client";

export const generateApi = {
	generate: (body: GenerateRequest): Promise<GenerateResponse> =>
		api.post("/generate/content", generateResponseSchema, { json: body }),
	regenerateHooks: (body: HooksOnlyRequest): Promise<HooksOnlyResponse> =>
		api.post("/generate/hooks", hooksOnlyResponseSchema, { json: body }),
	generateScript: (body: GenerateScriptRequest): Promise<GenerateScriptResponse> =>
		api.post("/generate/script", generateScriptResponseSchema, { json: body }),
};
