import { z } from "zod";
import { sceneTypeSchema } from "./images";

// Tone drives BGM selection. Keep the enum small for predictability.
export const videoToneSchema = z.enum(["motivational", "calm", "emotional"]);
export type VideoTone = z.infer<typeof videoToneSchema>;

// Energy is ORTHOGONAL to tone and drives pacing/rhythm, not BGM genre:
//   calm     → reflective, long breaths, 4–10s per scene, slow crossfade
//   balanced → current locked flow (current default for motivational /
//              emotional / reflective content)
//   exciting → animated delivery, tight breaths, 1.5–4s per scene, snap cuts
// When omitted, the server auto-detects from the idea + caption + hook text.
export const videoEnergySchema = z.enum(["calm", "balanced", "exciting"]);
export type VideoEnergy = z.infer<typeof videoEnergySchema>;

// OpenAI TTS voice IDs. Passed straight through to the TTS client.
//   alloy   — neutral, crisp
//   echo    — warm, grounded (male)
//   fable   — narrator, storytelling (british-ish)
//   onyx    — deep, confident (male)
//   nova    — bright, scroll-stopping (female)
//   shimmer — soft, friendly (female)
export const videoVoiceSchema = z.enum([
	"alloy",
	"echo",
	"fable",
	"onyx",
	"nova",
	"shimmer",
]);
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
	images: z.array(videoImageInputSchema).min(2).max(6),
	// TTS voiceover text; if omitted the server composes one from idea + caption + hook.
	voiceover: z.string().min(1).max(800).optional(),
	// Enable background music (user toggle). Defaults to true on the client.
	bgm: z.boolean().optional(),
	// Tone drives BGM pick + light voice styling. Defaults to "motivational".
	tone: videoToneSchema.optional(),
	// Optional S3 object key for a user-uploaded audio track (from their media
	// library). When present, server validates ownership + uses it as BGM
	// instead of the tone-based preset. Ignored if `bgm: false`.
	bgmKey: z.string().min(1).max(512).optional(),
	// TTS voice. Defaults to "nova" on the server if omitted.
	voice: videoVoiceSchema.optional(),
	// Pacing/rhythm bucket (voice + image cuts). When omitted, the server
	// auto-detects from idea/caption/hook. See `videoEnergySchema`.
	energy: videoEnergySchema.optional(),
});
export type GenerateVideoRequest = z.infer<typeof generateVideoRequestSchema>;

export const generateVideoResponseSchema = z.object({
	// Absolute URL the client can load + download. For web this is a presigned
	// S3 GET URL (durable, 2h TTL). For mobile + legacy callers this may still
	// be the local `/videos/:id.mp4` route (~1h TTL) during the transition.
	videoUrl: z.string().url(),
	/**
	 * S3 object key (e.g. `generated-videos/{userId}/{uuid}.mp4`) when the
	 * composed MP4 was uploaded to our bucket. Absent on legacy saves that
	 * only have the local `/videos/:id.mp4` URL. Clients persist this on
	 * their SavedPost so the server can re-presign `videoUrl` later.
	 */
	videoKey: z.string().min(1).optional(),
	// Echoed so the mobile client can show the voiceover text below the player.
	voiceover: z.string().min(1),
	durationMs: z.number().int().positive(),
	tone: videoToneSchema,
	bgmUsed: z.boolean(),
	// Echoed when a user-uploaded track drove the BGM, so the client can save
	// it on the post + regenerate later with the same track.
	bgmKey: z.string().min(1).optional(),
	voice: videoVoiceSchema,
	// Echoed so the client can persist + regenerate with the same pacing.
	energy: videoEnergySchema,
});
export type GenerateVideoResponse = z.infer<typeof generateVideoResponseSchema>;

export const generateVideoErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
});
export type GenerateVideoError = z.infer<typeof generateVideoErrorSchema>;
