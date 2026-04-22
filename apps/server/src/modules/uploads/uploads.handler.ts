import type { RouteHandler } from "@hono/zod-openapi";
import { UPLOAD_LIMITS, type UploadKind } from "@content-assist/shared";
import { logger } from "@server/lib/logger";
import type { AppEnv } from "@server/middleware/auth.middleware";
import {
	mediaRepo,
	profilesRepo,
	type MediaKind,
	type MediaMetadata,
} from "@server/services/profile";
import { storage } from "@server/services/storage";
import type {
	confirmUploadRoute,
	presignUploadRoute,
} from "@server/modules/uploads/uploads.schema";

const PREFIX_BY_KIND: Record<UploadKind, "avatars" | "covers" | "audio" | "images"> = {
	avatar: "avatars",
	cover: "covers",
	audio: "audio",
	image: "images",
};

/** Guess a file extension from a mime type. Falls back to `bin` — S3 doesn't care. */
function extFromMime(mime: string): string {
	const map: Record<string, string> = {
		"image/jpeg": "jpg",
		"image/png": "png",
		"image/webp": "webp",
		"audio/mpeg": "mp3",
		"audio/wav": "wav",
		"audio/mp4": "m4a",
		"audio/x-m4a": "m4a",
		"audio/aac": "aac",
	};
	return map[mime.toLowerCase()] ?? "bin";
}

function isMimeAllowed(kind: UploadKind, mime: string): boolean {
	return (UPLOAD_LIMITS[kind].mime as readonly string[]).includes(mime);
}

export const presignHandler: RouteHandler<typeof presignUploadRoute, AppEnv> = async (c) => {
	const userId = c.get("userId");
	const body = c.req.valid("json");
	const kind = body.kind as UploadKind;
	const limits = UPLOAD_LIMITS[kind];

	if (!isMimeAllowed(kind, body.mime)) {
		return c.json(
			{
				error: "unsupported_type",
				message: `Unsupported ${kind} type: ${body.mime}`,
			},
			400,
		);
	}
	if (body.sizeBytes > limits.maxBytes) {
		return c.json(
			{
				error: "too_large",
				message: `File is too large. Max ${Math.round(limits.maxBytes / 1024 / 1024)} MB for ${kind}.`,
			},
			400,
		);
	}

	const objectKey = storage.buildKey({
		prefix: PREFIX_BY_KIND[kind],
		userId,
		ext: extFromMime(body.mime),
	});
	const { uploadUrl, expiresAt } = await storage.presignPut({
		key: objectKey,
		contentType: body.mime,
		maxBytes: limits.maxBytes,
	});

	logger.info({
		msg: "uploads.presign",
		userId,
		kind,
		sizeBytes: body.sizeBytes,
		mime: body.mime,
	});

	return c.json(
		{
			uploadUrl,
			objectKey,
			expiresAt,
			maxSizeBytes: limits.maxBytes,
			contentType: body.mime,
		},
		200,
	);
};

export const confirmHandler: RouteHandler<typeof confirmUploadRoute, AppEnv> = async (c) => {
	const userId = c.get("userId");
	const body = c.req.valid("json");
	const kind = body.kind as UploadKind;

	// 1. Authoritative server-side verification via HeadObject.
	const head = await storage.headObject(body.objectKey);
	if (!head) {
		return c.json(
			{ error: "upload_missing", message: "Uploaded file not found in storage." },
			410,
		);
	}

	// 2. Ownership guard — prefix must be this user's scope.
	//    Keys look like `avatars/{userId}/{uuid}.ext`. Even though the DB
	//    layer will enforce ownership when we insert, catching a mismatched
	//    key here keeps cross-user confirm calls from muddying S3.
	const expectedPrefix = `${PREFIX_BY_KIND[kind]}/${userId}/`;
	if (!body.objectKey.startsWith(expectedPrefix)) {
		return c.json(
			{ error: "invalid_key", message: "Object key doesn't belong to this user." },
			400,
		);
	}

	// 3. Re-validate size + mime — trust the HEAD, not the request.
	const limits = UPLOAD_LIMITS[kind];
	if (!isMimeAllowed(kind, head.contentType)) {
		await storage.deleteObject(body.objectKey);
		return c.json(
			{
				error: "unsupported_type",
				message: `Uploaded object content-type ${head.contentType} is not allowed.`,
			},
			400,
		);
	}
	if (head.size > limits.maxBytes) {
		await storage.deleteObject(body.objectKey);
		return c.json(
			{
				error: "too_large",
				message: "Uploaded object exceeds the size cap.",
			},
			400,
		);
	}

	// 4. Persist. avatar/cover → profile row; audio/image → media row.
	if (kind === "avatar" || kind === "cover") {
		// Stash the old key so we can best-effort delete it after the swap.
		const profile = await profilesRepo.findOrCreate(userId);
		const oldKey = kind === "avatar" ? profile.avatarKey : profile.coverKey;
		await profilesRepo.update(userId, {
			[kind === "avatar" ? "avatarKey" : "coverKey"]: body.objectKey,
		});
		if (oldKey && oldKey !== body.objectKey) {
			void storage.deleteObject(oldKey);
		}
		const { url, expiresAt } = await storage.presignGet({ key: body.objectKey });
		logger.info({
			msg: "uploads.confirm.profile_image",
			userId,
			kind,
			objectKey: body.objectKey,
		});
		return c.json({ kind, url, urlExpiresAt: expiresAt }, 200);
	}

	const metadata: MediaMetadata = {};
	if (typeof body.durationSec === "number") metadata.durationSec = body.durationSec;
	if (typeof body.width === "number") metadata.width = body.width;
	if (typeof body.height === "number") metadata.height = body.height;

	const row = await mediaRepo.create({
		userId,
		kind: kind as MediaKind,
		name: body.name?.trim() || body.objectKey.split("/").pop() || "Untitled",
		objectKey: body.objectKey,
		mime: head.contentType,
		sizeBytes: head.size,
		metadata,
		tags: body.tags ?? [],
	});

	const { url, expiresAt } = await storage.presignGet({ key: body.objectKey });

	logger.info({
		msg: "uploads.confirm.media",
		userId,
		kind,
		assetId: row.id,
		sizeBytes: row.sizeBytes,
	});

	return c.json(
		{
			kind: row.kind as MediaKind,
			asset: {
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
			},
		},
		200,
	);
};
