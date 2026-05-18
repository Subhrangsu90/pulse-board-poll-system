import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { polls } from "./polls.model";

export const questionTypeEnum = pgEnum("question_type", ["single_choice", "multiple_choice"]);

export const questions = pgTable("questions", {
	id: uuid("id").primaryKey().defaultRandom(),
	pollId: uuid("poll_id")
		.notNull()
		.references(() => polls.id, { onDelete: "cascade" }),
	questionText: text("question_text").notNull(),
	questionType: questionTypeEnum("question_type").default("single_choice"),
	isRequired: boolean("is_required").default(true),
	orderIndex: integer("order_index").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
