import { z } from "zod";
import { sceneTypeSchema } from "./images";

// Tone drives BGM selection. Keep the enum small for predictability.
export const videoToneSchema = z.enum(["motivational", "calm", "emotional"]);
export type VideoTone = z.infer<typeof videoToneSchema>;

// Voice gender. Server maps to OpenAI TTS voices:
//   "female" → nova (bright, scroll-stopping)
//   "male"   → onyx (deep, confident)
export const videoVoiceSchema = z.enum(["female", "male"]);
export type VideoVoice = z.infer<typeof videoVoiceSchema>;

// Image source for the video. We expect 2–3 image URLs (already generated
// upstream via /images/generate). No more — costs and composition time scale linearly.
// sceneType optional for backwards compat; when present, the compose pipeline
// picks a scene-typed motion (zoom-in for struggle, static for decision,
// zoom-out for result) so the arc reads as a story.
export const videoImageInputSchema = z.object({
	url: z.string().url(),
	label: z.string().max(60).optional(),
	sceneType: sceneTypeSchema.optional(),
});

export const generateVideoRequestSchema = z.object({
	idea: z.string().min(3).max(500),
	caption: z.string().min(1).max(500),
	// Optional: the recommended hook lets the voiceover open with a scroll-stopper
	// and lengthens the total speech, which keeps multi-scene videos from being trimmed.
	hook: z.string().max(200).optional(),
	images: z.array(videoImageInputSchema).min(2).max(3),
	// TTS voiceover text; if omitted the server composes one from idea + caption + hook.
	voiceover: z.string().min(1).max(800).optional(),
	// Enable background music (user toggle). Defaults to true on the client.
	bgm: z.boolean().optional(),
	// Tone drives BGM pick + light voice styling. Defaults to "motivational".
	tone: videoToneSchema.optional(),
	// Voice gender for TTS. Defaults to "female" (nova) if omitted.
	voice: videoVoiceSchema.optional(),
});
export type GenerateVideoRequest = z.infer<typeof generateVideoRequestSchema>;

export const generateVideoResponseSchema = z.object({
	// Absolute URL the mobile app can load + download. Served from the server's
	// /videos/:id.mp4 route; lives for ~1h before cleanup.
	videoUrl: z.string().url(),
	// Echoed so the mobile client can show the voiceover text below the player.
	voiceover: z.string().min(1),
	durationMs: z.number().int().positive(),
	tone: videoToneSchema,
	bgmUsed: z.boolean(),
	voice: videoVoiceSchema,
});
export type GenerateVideoResponse = z.infer<typeof generateVideoResponseSchema>;

export const generateVideoErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
});
export type GenerateVideoError = z.infer<typeof generateVideoErrorSchema>;
