import { integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { questions } from "./questions.model";

export const options = pgTable("options", {
	id: uuid("id").primaryKey().defaultRandom(),
	questionId: uuid("question_id")
		.notNull()
		.references(() => questions.id, { onDelete: "cascade" }),
	optionText: varchar("option_text", { length: 255 }).notNull(),
	orderIndex: integer("order_index").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
