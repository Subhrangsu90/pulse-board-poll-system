import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { users } from "../../auth/model/user.model";

export const pollResponseModeEnum = pgEnum("poll_response_mode", ["anonymous", "authenticated"]);

export const pollStatusEnum = pgEnum("poll_status", ["draft", "active", "expired", "completed"]);

export const polls = pgTable(
	"polls",
	{
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
		totalResponses: integer("total_responses").default(0).notNull(),
		anonymousResponses: integer("anonymous_responses").default(0).notNull(),
		authenticatedResponses: integer("authenticated_responses").default(0).notNull(),
		lastResponseAt: timestamp("last_response_at"),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => [
		index("polls_creator_created_at_idx").on(table.creatorId, table.createdAt),
		index("polls_active_expires_at_idx")
			.on(table.expiresAt)
			.where(sql`${table.status} = 'active'`),
	]
);
