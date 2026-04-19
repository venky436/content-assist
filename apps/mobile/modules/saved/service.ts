import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SavedPost } from "@content-assist/shared";

const STORAGE_KEY = "saved_posts";

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function readAll(): Promise<SavedPost[]> {
	try {
		const raw = await AsyncStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed as SavedPost[];
	} catch {
		return [];
	}
}

async function writeAll(posts: SavedPost[]): Promise<void> {
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

export const savedPostsService = {
	async list(): Promise<SavedPost[]> {
		const posts = await readAll();
		return [...posts].sort((a, b) => b.updatedAt - a.updatedAt);
	},

	async get(id: string): Promise<SavedPost | null> {
		const posts = await readAll();
		return posts.find((p) => p.id === id) ?? null;
	},

	async save(
		draft: Omit<SavedPost, "id" | "createdAt" | "updatedAt">,
	): Promise<SavedPost> {
		const now = Date.now();
		const post: SavedPost = {
			...draft,
			id: generateId(),
			createdAt: now,
			updatedAt: now,
		};
		const posts = await readAll();
		posts.unshift(post);
		await writeAll(posts);
		return post;
	},

	async update(
		id: string,
		patch: Partial<Omit<SavedPost, "id" | "createdAt">>,
	): Promise<SavedPost | null> {
		const posts = await readAll();
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
		await writeAll(posts);
		return updated;
	},

	async remove(id: string): Promise<void> {
		const posts = await readAll();
		const filtered = posts.filter((p) => p.id !== id);
		await writeAll(filtered);
	},

	async clear(): Promise<void> {
		await AsyncStorage.removeItem(STORAGE_KEY);
	},
};
