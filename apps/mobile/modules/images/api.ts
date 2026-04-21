import {
	generateImagesResponseSchema,
	type GenerateImagesRequest,
	type GenerateImagesResponse,
} from "@content-assist/shared";
import { api } from "@mobile/lib/api-client";

// Images run SEQUENTIALLY on the server (to respect Replicate's burst=1 throttle).
// Worst case for 3 scenes with one 429-retry each: ~3s + 3s + 11s retry + 3s + 11s retry + 3s
// ≈ 35s. Give a generous buffer so the phone doesn't give up before the server finishes.
const IMAGES_TIMEOUT_MS = 90_000;

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
