import type { SavedPost } from "@content-assist/shared";

const STORAGE_KEY = "contentassist:saved_posts";

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function readAll(): SavedPost[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed as SavedPost[];
	} catch {
		return [];
	}
}

function writeAll(posts: SavedPost[]): void {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

export const savedPostsService = {
	list(): SavedPost[] {
		return [...readAll()].sort((a, b) => b.updatedAt - a.updatedAt);
	},

	get(id: string): SavedPost | null {
		return readAll().find((p) => p.id === id) ?? null;
	},

	save(draft: Omit<SavedPost, "id" | "createdAt" | "updatedAt">): SavedPost {
		const now = Date.now();
		const post: SavedPost = {
			...draft,
			id: generateId(),
			createdAt: now,
			updatedAt: now,
		};
		const posts = readAll();
		posts.unshift(post);
		writeAll(posts);
		return post;
	},

	update(
		id: string,
		patch: Partial<Omit<SavedPost, "id" | "createdAt">>,
	): SavedPost | null {
		const posts = readAll();
		const idx = posts.findIndex((p) => p.id === id);
		if (idx === -1) return null;
		const existing = posts[idx];
		if (!existing) return null;
		const updated: SavedPost = {
			...existing,
			...patch,
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: Date.now(),
		};
		posts[idx] = updated;
		writeAll(posts);
		return updated;
	},

	remove(id: string): void {
		writeAll(readAll().filter((p) => p.id !== id));
	},

	clear(): void {
		if (typeof window === "undefined") return;
		window.localStorage.removeItem(STORAGE_KEY);
	},
};
