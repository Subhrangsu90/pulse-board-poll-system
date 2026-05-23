import { index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { questions } from "./questions.model";

export const options = pgTable(
	"options",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		questionId: uuid("question_id")
			.notNull()
			.references(() => questions.id, { onDelete: "cascade" }),
		optionText: varchar("option_text", { length: 255 }).notNull(),
		orderIndex: integer("order_index").notNull(),
		selectionCount: integer("selection_count").default(0).notNull(),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => [index("options_question_order_idx").on(table.questionId, table.orderIndex)]
);
