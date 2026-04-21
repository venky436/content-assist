import type { ContentType } from "../schemas/generate";

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
	}>;

	// Attached composed reel video (from /video/generate). Note: the `videoUrl`
	// points to the server's /tmp directory which cleans up after ~1h. Callers
	// should handle a 404 gracefully and offer a Regenerate action.
	video?: {
		videoUrl: string;
		voiceover: string;
		durationMs: number;
		bgmUsed: boolean;
		generatedAt: number;
		voice?: "female" | "male"; // optional for BC; newer saves include it
	};

	createdAt: number;
	updatedAt: number;
};
