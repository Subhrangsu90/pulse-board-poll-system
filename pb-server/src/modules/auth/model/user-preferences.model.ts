import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { pollResponseModeEnum } from "../../poll/model/polls.model";
import { users } from "./user.model";

export const userPreferences = pgTable("user_preferences", {
	userId: uuid("user_id")
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),
	defaultResponseMode: pollResponseModeEnum("default_response_mode").notNull().default("anonymous"),
	themeMode: varchar("theme_mode", { length: 16 }).notNull().default("system"),
	textScale: varchar("text_scale", { length: 16 }).notNull().default("comfortable"),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
