import { sql } from "drizzle-orm";
import {
	boolean,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { users } from "../../auth/dto/user.dto";

export const pollResponseModeEnum = pgEnum("poll_response_mode", ["anonymous", "authenticated"]);

export const pollStatusEnum = pgEnum("poll_status", ["draft", "active", "expired", "completed"]);

export const polls = pgTable("polls", {
	id: uuid("id").primaryKey().defaultRandom(),
	creatorId: uuid("creator_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	title: varchar("title", { length: 255 }).notNull(),
	description: text("description"),
	tags: text("tags")
		.array()
		.notNull()
		.default(sql`'{}'::text[]`),
	responseMode: pollResponseModeEnum("response_mode").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	isPublished: boolean("is_published").default(false),
	status: pollStatusEnum("status").default("draft"),
	publicSlug: varchar("public_slug", { length: 255 }).unique(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
