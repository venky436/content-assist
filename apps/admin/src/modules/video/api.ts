import {
	generateVideoResponseSchema,
	type GenerateVideoRequest,
	type GenerateVideoResponse,
} from "@content-assist/shared";
import { api } from "@/lib/api-client";

// TTS + FFmpeg compose takes 10–25s typically; give generous headroom.
const VIDEO_TIMEOUT_MS = 180_000;

export const videoApi = {
	generate: (body: GenerateVideoRequest): Promise<GenerateVideoResponse> =>
		api.post("/video/generate", generateVideoResponseSchema, {
			json: body,
			timeout: VIDEO_TIMEOUT_MS,
		}),
};
