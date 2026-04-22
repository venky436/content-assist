import { sql } from "drizzle-orm";
import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * User's private media library — one table, discriminated by `kind`.
 *
 * Adding `video` / `template` / `font` later requires zero migration; just
 * widen the zod enum. Type-specific fields (duration for audio, dims for
 * images) live in the jsonb `metadata` column.
 *
 * Authorization is enforced at the app layer (every query filters by userId).
 * S3 keys are random UUIDs so enumerating keys doesn't yield anything.
 */
export type MediaMetadata = {
	durationSec?: number;
	width?: number;
	height?: number;
};

export const userMediaAssets = pgTable(
	"user_media_assets",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		kind: text("kind", { enum: ["audio", "image"] }).notNull(),
		name: text("name").notNull(),
		objectKey: text("object_key").notNull().unique(),
		mime: text("mime").notNull(),
		sizeBytes: integer("size_bytes").notNull(),
		metadata: jsonb("metadata").$type<MediaMetadata>().notNull().default({}),
		tags: text("tags")
			.array()
			.notNull()
			.default(sql`'{}'::text[]`),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		userKindIdx: index("user_media_assets_user_kind_idx").on(
			t.userId,
			t.kind,
			t.createdAt,
		),
	}),
);

export type UserMediaAsset = typeof userMediaAssets.$inferSelect;
export type NewUserMediaAsset = typeof userMediaAssets.$inferInsert;
