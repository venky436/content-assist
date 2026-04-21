import {
	generateVideoResponseSchema,
	type GenerateVideoRequest,
	type GenerateVideoResponse,
} from "@content-assist/shared";
import { api } from "@mobile/lib/api-client";

export const videoApi = {
	generate: (body: GenerateVideoRequest): Promise<GenerateVideoResponse> =>
		api.post("/video/generate", generateVideoResponseSchema, {
			json: body,
			timeout: 120_000,
		}),
};
