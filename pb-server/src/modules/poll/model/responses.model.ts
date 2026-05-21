import { index, boolean, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "../../auth/model/user.model";
import { polls } from "./polls.model";

export const responses = pgTable(
	"responses",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		pollId: uuid("poll_id")
			.notNull()
			.references(() => polls.id, { onDelete: "cascade" }),
		userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
		anonymousUserIdentifier: varchar("anonymous_user_identifier", { length: 255 }),
		isAnonymous: boolean("is_anonymous").notNull(),
		submittedAt: timestamp("submitted_at").defaultNow(),
		ipAddress: varchar("ip_address", { length: 100 }),
	},
	(table) => [
		index("responses_poll_submitted_at_idx").on(table.pollId, table.submittedAt),
		index("responses_user_idx").on(table.userId),
	]
);
