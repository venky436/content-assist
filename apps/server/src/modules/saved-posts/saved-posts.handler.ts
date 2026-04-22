import type { RouteHandler } from "@hono/zod-openapi";
import { logger } from "@server/lib/logger";
import type { AppEnv } from "@server/middleware/auth.middleware";
import {
	collectS3Keys,
	rehydrateUrls,
	savedPostsRepo,
	type SavedPostRow,
} from "@server/services/saved-posts";
import { storage } from "@server/services/storage";
import type {
	createSavedPostRoute,
	deleteSavedPostRoute,
	getSavedPostRoute,
	listSavedPostsRoute,
} from "@server/modules/saved-posts/saved-posts.schema";

/**
 * Turn a DB row into the shape the client expects: the stored `content`
 * JSONB flattened at the top level, with `id`/`createdAt`/`updatedAt` added,
 * and every nested media URL re-presigned from its stored objectKey.
 *
 * Return type is cast to `any` because `content` is a JSONB grab-bag — the
 * zod schema (`.passthrough()`) validates it at runtime, and every real
 * field is present, but TS can't see through the JSONB. The alternative
 * (a discriminated union covering every SavedPost branch) isn't worth it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function toDTO(row: SavedPostRow): Promise<any> {
	const rehydrated = await rehydrateUrls(row.content ?? {});
	return {
		...rehydrated,
		id: row.id,
		source: row.source,
		mode: row.mode ?? undefined,
		contentType: row.contentType,
		createdAt: row.createdAt.getTime(),
		updatedAt: row.updatedAt.getTime(),
	};
}

export const createSavedPostHandler: RouteHandler<typeof createSavedPostRoute, AppEnv> = async (c) => {
	const userId = c.get("userId");
	const body = c.req.valid("json") as Record<string, unknown> & {
		source: string;
		mode?: string;
		contentType: string;
	};

	// Strip outer anchors from the body; the rest goes into JSONB verbatim.
	// Also drop client-supplied id/createdAt/updatedAt — the server is authoritative.
	const {
		id: _id,
		createdAt: _createdAt,
		updatedAt: _updatedAt,
		source,
		mode,
		contentType,
		...content
	} = body;

	const s3Keys = collectS3Keys(content);

	const row = await savedPostsRepo.create({
		userId,
		source,
		mode: mode ?? null,
		contentType,
		content,
		s3Keys,
	});

	logger.info({
		msg: "saved-posts.create",
		userId,
		id: row.id,
		source,
		s3KeyCount: s3Keys.length,
	});

	const post = await toDTO(row);
	return c.json({ post }, 201);
};

export const listSavedPostsHandler: RouteHandler<typeof listSavedPostsRoute, AppEnv> = async (c) => {
	const userId = c.get("userId");
	const q = c.req.valid("query");
	const { items, nextCursor } = await savedPostsRepo.listByUser(userId, {
		source: q.source,
		cursor: q.cursor,
		limit: q.limit,
	});
	const dtos = await Promise.all(items.map(toDTO));
	return c.json({ items: dtos, nextCursor }, 200);
};

export const getSavedPostHandler: RouteHandler<typeof getSavedPostRoute, AppEnv> = async (c) => {
	const userId = c.get("userId");
	const { id } = c.req.valid("param");
	const row = await savedPostsRepo.findByIdForUser(id, userId);
	if (!row) {
		return c.json({ error: "not_found", message: "Saved post not found." }, 404);
	}
	return c.json({ post: await toDTO(row) }, 200);
};

export const deleteSavedPostHandler: RouteHandler<typeof deleteSavedPostRoute, AppEnv> = async (c) => {
	const userId = c.get("userId");
	const { id } = c.req.valid("param");

	const row = await savedPostsRepo.deleteForUser(id, userId);
	if (!row) {
		return c.json({ error: "not_found", message: "Saved post not found." }, 404);
	}

	// Cascade-delete S3 objects. Parallel + best-effort — an orphan is a
	// cleanup problem, not a user-visible failure.
	const keys = row.s3Keys ?? [];
	if (keys.length > 0) {
		await Promise.all(keys.map((k) => storage.deleteObject(k)));
	}
	logger.info({
		msg: "saved-posts.delete",
		userId,
		id,
		s3KeyCount: keys.length,
	});

	return c.json({ ok: true as const }, 200);
};
