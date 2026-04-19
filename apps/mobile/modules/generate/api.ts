import {
	generateResponseSchema,
	hooksOnlyResponseSchema,
	type GenerateRequest,
	type GenerateResponse,
	type HooksOnlyRequest,
	type HooksOnlyResponse,
} from "@content-assist/shared";
import { api } from "@mobile/lib/api-client";

export const generateApi = {
	generate: (body: GenerateRequest): Promise<GenerateResponse> =>
		api.post("/generate", generateResponseSchema, { json: body }),
	regenerateHooks: (body: HooksOnlyRequest): Promise<HooksOnlyResponse> =>
		api.post("/generate/hooks", hooksOnlyResponseSchema, { json: body }),
};
