import {
	generateImagesResponseSchema,
	type GenerateImagesRequest,
	type GenerateImagesResponse,
} from "@content-assist/shared";
import { api } from "@mobile/lib/api-client";

export const imagesApi = {
	generate: (body: GenerateImagesRequest): Promise<GenerateImagesResponse> =>
		api.post("/images/generate", generateImagesResponseSchema, { json: body }),
	regenerate: (body: GenerateImagesRequest): Promise<GenerateImagesResponse> =>
		api.post("/images/regenerate", generateImagesResponseSchema, { json: body }),
};
