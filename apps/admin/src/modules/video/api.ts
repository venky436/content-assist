import {
	generateVideoResponseSchema,
	type GenerateVideoRequest,
	type GenerateVideoResponse,
} from "@content-assist/shared";
import { api } from "@/lib/api-client";

// TTS + FFmpeg compose takes 10–25s locally, but can stretch to ~3 min on the
// 2GB dev droplet under contention. 5 min is the hard ceiling before we give up.
const VIDEO_TIMEOUT_MS = 300_000;

export const videoApi = {
	generate: (body: GenerateVideoRequest): Promise<GenerateVideoResponse> =>
		api.post("/video/generate", generateVideoResponseSchema, {
			json: body,
			timeout: VIDEO_TIMEOUT_MS,
		}),
};
