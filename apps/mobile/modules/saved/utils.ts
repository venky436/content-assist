import type { GenerateMode, SavedPost } from "@content-assist/shared";

/**
 * Read a saved post's mode, defaulting to "faceless" for older saves that
 * pre-date the Dual-Mode UI. Use this everywhere the saved UI branches on mode.
 */
export function getPostMode(post: SavedPost): GenerateMode {
	return post.mode ?? "faceless";
}
