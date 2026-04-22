import { sql } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * User-saved posts. One row per Save click from Generate or Analyze.
 *
 * The bulk of the payload (hooks, caption, hashtags, images[], video, analyze
 * fields) is kept in the `content` JSONB column — the SavedPost shape evolves
 * faster than we want to migrate SQL columns. Indexable fields sit on the
 * outside so we can filter + sort without opening the JSON.
 *
 * `s3Keys` carries every S3 object this post owns (images + composed video).
 * On delete we iterate and fire `storage.deleteObject` — no walking of the
 * JSON is needed so cascade-delete stays O(n) in assets.
 */
export const savedPosts = pgTable(
	"saved_posts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		/** "generate" | "analyze" — same as SavedPost.source. */
		source: text("source").notNull(),
		/** "faceless" | "on_camera" | other — matches SavedPost.mode. */
		mode: text("mode"),
		/** "hooks+caption" | "caption_only" | "hooks_only" | "script" | "analyzed" — from SavedPost.contentType. */
		contentType: text("content_type").notNull(),
		/** Full SavedPost body as JSONB. Variable fields live here; we never query into it except by id/userId. */
		content: jsonb("content").$type<Record<string, unknown>>().notNull(),
		/** Every S3 object this post owns. Cascade-delete iterates this. */
		s3Keys: text("s3_keys")
			.array()
			.notNull()
			.default(sql`'{}'::text[]`),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		userCreatedIdx: index("saved_posts_user_created_idx").on(
			t.userId,
			t.createdAt,
		),
	}),
);

export type SavedPostRow = typeof savedPosts.$inferSelect;
export type NewSavedPostRow = typeof savedPosts.$inferInsert;
