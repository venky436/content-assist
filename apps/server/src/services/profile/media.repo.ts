import { and, desc, eq, lt } from "drizzle-orm";
import {
	userMediaAssets,
	type MediaMetadata,
	type NewUserMediaAsset,
	type UserMediaAsset,
} from "@content-assist/db/schema";
import { getDb } from "./db";

export type MediaKind = "audio" | "image";

type ListOptions = {
	kind?: MediaKind;
	/** Cursor = ISO timestamp. Rows older than the cursor are returned. */
	cursor?: string;
	limit?: number;
};

export const mediaRepo = {
	async create(input: {
		userId: string;
		kind: MediaKind;
		name: string;
		objectKey: string;
		mime: string;
		sizeBytes: number;
		metadata?: MediaMetadata;
		tags?: string[];
	}): Promise<UserMediaAsset> {
		const values: NewUserMediaAsset = {
			userId: input.userId,
			kind: input.kind,
			name: input.name,
			objectKey: input.objectKey,
			mime: input.mime,
			sizeBytes: input.sizeBytes,
			metadata: input.metadata ?? {},
			tags: input.tags ?? [],
		};
		const [row] = await getDb().insert(userMediaAssets).values(values).returning();
		if (!row) throw new Error("media.create: no row returned");
		return row;
	},

	async findByIdForUser(
		id: string,
		userId: string,
	): Promise<UserMediaAsset | null> {
		const rows = await getDb()
			.select()
			.from(userMediaAssets)
			.where(
				and(eq(userMediaAssets.id, id), eq(userMediaAssets.userId, userId)),
			)
			.limit(1);
		return rows[0] ?? null;
	},

	async findByObjectKeyForUser(
		objectKey: string,
		userId: string,
		kind?: MediaKind,
	): Promise<UserMediaAsset | null> {
		const filters = [
			eq(userMediaAssets.objectKey, objectKey),
			eq(userMediaAssets.userId, userId),
		];
		if (kind) filters.push(eq(userMediaAssets.kind, kind));
		const rows = await getDb()
			.select()
			.from(userMediaAssets)
			.where(and(...filters))
			.limit(1);
		return rows[0] ?? null;
	},

	async listByUser(
		userId: string,
		opts: ListOptions = {},
	): Promise<{ items: UserMediaAsset[]; nextCursor: string | null }> {
		const limit = Math.min(Math.max(opts.limit ?? 24, 1), 100);
		const filters = [eq(userMediaAssets.userId, userId)];
		if (opts.kind) filters.push(eq(userMediaAssets.kind, opts.kind));
		if (opts.cursor)
			filters.push(lt(userMediaAssets.createdAt, new Date(opts.cursor)));

		// Fetch limit+1 to know whether there's another page.
		const rows = await getDb()
			.select()
			.from(userMediaAssets)
			.where(and(...filters))
			.orderBy(desc(userMediaAssets.createdAt))
			.limit(limit + 1);

		const hasMore = rows.length > limit;
		const items = hasMore ? rows.slice(0, limit) : rows;
		const nextCursor = hasMore
			? items[items.length - 1]!.createdAt.toISOString()
			: null;
		return { items, nextCursor };
	},

	async updateForUser(
		id: string,
		userId: string,
		patch: { name?: string; tags?: string[] },
	): Promise<UserMediaAsset | null> {
		const [row] = await getDb()
			.update(userMediaAssets)
			.set(patch)
			.where(
				and(eq(userMediaAssets.id, id), eq(userMediaAssets.userId, userId)),
			)
			.returning();
		return row ?? null;
	},

	async deleteForUser(id: string, userId: string): Promise<UserMediaAsset | null> {
		const [row] = await getDb()
			.delete(userMediaAssets)
			.where(
				and(eq(userMediaAssets.id, id), eq(userMediaAssets.userId, userId)),
			)
			.returning();
		return row ?? null;
	},
};

export type { UserMediaAsset, MediaMetadata };
