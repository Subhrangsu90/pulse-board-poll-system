import { sql } from "drizzle-orm";
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "../../auth/model/user.model";
import { polls } from "./polls.model";

export const responseSessions = pgTable(
	"response_sessions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		pollId: uuid("poll_id")
			.notNull()
			.references(() => polls.id, { onDelete: "cascade" }),
		userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
		anonymousIdentifier: varchar("anonymous_identifier", { length: 255 }),
		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => [
		index("response_sessions_poll_created_at_idx").on(table.pollId, table.createdAt),
		uniqueIndex("response_sessions_poll_user_unique")
			.on(table.pollId, table.userId)
			.where(sql`${table.userId} is not null`),
		uniqueIndex("response_sessions_poll_anonymous_unique")
			.on(table.pollId, table.anonymousIdentifier)
			.where(sql`${table.anonymousIdentifier} is not null`),
	],
);
