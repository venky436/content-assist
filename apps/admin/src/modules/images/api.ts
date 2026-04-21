import {
	generateImagesResponseSchema,
	type GenerateImagesRequest,
	type GenerateImagesResponse,
} from "@content-assist/shared";
import { api } from "@/lib/api-client";

// Images on the throttled Replicate tier can take 30–90s for 3 scenes.
const IMAGES_TIMEOUT_MS = 120_000;

export const imagesApi = {
	generate: (body: GenerateImagesRequest): Promise<GenerateImagesResponse> =>
		api.post("/images/generate", generateImagesResponseSchema, {
			json: body,
			timeout: IMAGES_TIMEOUT_MS,
		}),
	regenerate: (body: GenerateImagesRequest): Promise<GenerateImagesResponse> =>
		api.post("/images/regenerate", generateImagesResponseSchema, {
			json: body,
			timeout: IMAGES_TIMEOUT_MS,
		}),
};
