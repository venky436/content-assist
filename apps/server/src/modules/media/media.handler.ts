import type { RouteHandler } from "@hono/zod-openapi";
import type { MediaAsset, MediaKind } from "@content-assist/shared";
import { logger } from "@server/lib/logger";
import type { AppEnv } from "@server/middleware/auth.middleware";
import {
	mediaRepo,
	type UserMediaAsset,
} from "@server/services/profile";
import { storage } from "@server/services/storage";
import type {
	deleteMediaRoute,
	listMediaRoute,
	updateMediaRoute,
} from "@server/modules/media/media.schema";

async function toAssetDTO(row: UserMediaAsset): Promise<MediaAsset> {
	const { url, expiresAt } = await storage.presignGet({ key: row.objectKey });
	return {
		id: row.id,
		kind: row.kind as MediaKind,
		name: row.name,
		url,
		urlExpiresAt: expiresAt,
		mime: row.mime,
		sizeBytes: row.sizeBytes,
		metadata: row.metadata,
		tags: row.tags,
		createdAt: row.createdAt.toISOString(),
		objectKey: row.objectKey,
	};
}

export const listMediaHandler: RouteHandler<typeof listMediaRoute, AppEnv> = async (c) => {
	const userId = c.get("userId");
	const q = c.req.valid("query");
	const { items, nextCursor } = await mediaRepo.listByUser(userId, {
		kind: q.kind,
		cursor: q.cursor,
		limit: q.limit,
	});
	// Presign in parallel — typical page is ≤ 24 items.
	const assets = await Promise.all(items.map(toAssetDTO));
	return c.json({ items: assets, nextCursor }, 200);
};

export const updateMediaHandler: RouteHandler<typeof updateMediaRoute, AppEnv> = async (c) => {
	const userId = c.get("userId");
	const { id } = c.req.valid("param");
	const body = c.req.valid("json");

	const patched = await mediaRepo.updateForUser(id, userId, {
		name: body.name?.trim(),
		tags: body.tags,
	});
	if (!patched) {
		return c.json(
			{ error: "not_found", message: "Asset not found." },
			404,
		);
	}
	return c.json({ asset: await toAssetDTO(patched) }, 200);
};

export const deleteMediaHandler: RouteHandler<typeof deleteMediaRoute, AppEnv> = async (c) => {
	const userId = c.get("userId");
	const { id } = c.req.valid("param");

	const deleted = await mediaRepo.deleteForUser(id, userId);
	if (!deleted) {
		return c.json(
			{ error: "not_found", message: "Asset not found." },
			404,
		);
	}
	// Fire-and-forget — orphan log is the recovery path if this fails.
	void storage.deleteObject(deleted.objectKey);
	logger.info({
		msg: "media.delete",
		userId,
		assetId: id,
		objectKey: deleted.objectKey,
	});
	return c.json({ ok: true as const }, 200);
};
