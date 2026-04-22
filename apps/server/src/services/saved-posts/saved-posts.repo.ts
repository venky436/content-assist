import { and, desc, eq, lt, sql } from "drizzle-orm";
import {
	savedPosts,
	type NewSavedPostRow,
	type SavedPostRow,
} from "@content-assist/db/schema";
import { getDb } from "@server/services/profile/db";

/**
 * Thin Drizzle repo over `saved_posts`. userId-scoped on every read/write so
 * cross-user access can't happen by accident.
 */

type ListOptions = {
	source?: string;
	/** ISO datetime. Rows strictly older than the cursor are returned. */
	cursor?: string;
	limit?: number;
};

export const savedPostsRepo = {
	async create(input: NewSavedPostRow): Promise<SavedPostRow> {
		const [row] = await getDb().insert(savedPosts).values(input).returning();
		if (!row) throw new Error("saved-posts.create: no row returned");
		return row;
	},

	async findByIdForUser(
		id: string,
		userId: string,
	): Promise<SavedPostRow | null> {
		const rows = await getDb()
			.select()
			.from(savedPosts)
			.where(and(eq(savedPosts.id, id), eq(savedPosts.userId, userId)))
			.limit(1);
		return rows[0] ?? null;
	},

	async listByUser(
		userId: string,
		opts: ListOptions = {},
	): Promise<{ items: SavedPostRow[]; nextCursor: string | null }> {
		const limit = Math.min(Math.max(opts.limit ?? 24, 1), 100);
		const filters = [eq(savedPosts.userId, userId)];
		if (opts.source) filters.push(eq(savedPosts.source, opts.source));
		if (opts.cursor)
			filters.push(lt(savedPosts.createdAt, new Date(opts.cursor)));

		const rows = await getDb()
			.select()
			.from(savedPosts)
			.where(and(...filters))
			.orderBy(desc(savedPosts.createdAt))
			.limit(limit + 1);

		const hasMore = rows.length > limit;
		const items = hasMore ? rows.slice(0, limit) : rows;
		const nextCursor = hasMore
			? items[items.length - 1]!.createdAt.toISOString()
			: null;
		return { items, nextCursor };
	},

	async deleteForUser(
		id: string,
		userId: string,
	): Promise<SavedPostRow | null> {
		const [row] = await getDb()
			.delete(savedPosts)
			.where(and(eq(savedPosts.id, id), eq(savedPosts.userId, userId)))
			.returning();
		return row ?? null;
	},
};

export type { SavedPostRow, NewSavedPostRow };

/** Re-export sql util so callers that need raw expressions don't re-import. */
export { sql };
