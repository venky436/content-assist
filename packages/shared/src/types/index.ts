import type { ContentType } from "../schemas/generate";

export type SavedPostSource = "generate" | "analyze";

export type SavedPost = {
	id: string;
	source: SavedPostSource;
	idea: string;
	contentType: ContentType;

	// from Generate
	hooks?: string[];
	recommendedHook?: string;
	recommendedReason?: string;
	caption?: string;
	hashtags?: string[];

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

	createdAt: number;
	updatedAt: number;
};
