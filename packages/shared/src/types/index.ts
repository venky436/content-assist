import type { ContentType } from "../schemas/generate";
import type { VideoEnergy, VideoVoice } from "../schemas/video";

export type SavedPostSource = "generate" | "analyze";

// Which creator workflow this post was built for.
// Optional on read for backwards-compat with older saves — use getPostMode() on the client.
export type GenerateMode = "faceless" | "on_camera";

export type SavedPost = {
	id: string;
	source: SavedPostSource;
	mode?: GenerateMode;
	idea: string;
	contentType: ContentType;

	// from Generate (Faceless mode)
	hooks?: string[];
	recommendedHook?: string;
	recommendedReason?: string;
	caption?: string;
	hashtags?: string[];

	// from Generate (On-Camera mode)
	scriptHook?: string;
	scriptLines?: string[];
	scriptCta?: string;

	// from Analyze
	originalContent?: string;
	score?: number;
	verdict?: "Weak" | "Average" | "Strong" | "Very Strong";
	betterHook?: string;
	improvedPost?: string;

	// Attached images (from /images/generate or /images/regenerate)
	images?: Array<{
		url: string;
		prompt: string;
		generatedAt: number;
		sceneType?: "struggle" | "decision" | "result";
		label?: string;
		type?: string; // legacy (old saved posts); readers should prefer `label`
		/**
		 * S3 object key under our bucket (e.g. `generated-images/{userId}/{uuid}.jpg`).
		 * The server re-presigns `url` from this key on every read so the displayed
		 * URL never rots. Absent on legacy saves from before the S3 mirror shipped.
		 */
		objectKey?: string;
	}>;

	// Attached composed reel video (from /video/generate). `videoUrl` is a
	// presigned S3 GET with a short TTL; the server refreshes it on every fetch
	// via `videoKey`. Legacy saves may still point at the server's local
	// `/videos/:id.mp4` path — renderers should handle a 404 gracefully.
	video?: {
		videoUrl: string;
		voiceover: string;
		durationMs: number;
		bgmUsed: boolean;
		generatedAt: number;
		voice?: VideoVoice; // optional for BC; newer saves include it
		/** S3 object key for the composed MP4 in our bucket, when present. */
		videoKey?: string;
		/** S3 object key of the user-uploaded BGM track, when a custom track drove composition. */
		bgmKey?: string;
		/** Pacing bucket used for this video's voice + image cuts. */
		energy?: VideoEnergy;
	};

	createdAt: number;
	updatedAt: number;
};
