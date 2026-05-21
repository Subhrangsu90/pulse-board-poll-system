import { index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { options } from "./options.model";
import { questions } from "./questions.model";
import { responses } from "./responses.model";

export const answers = pgTable(
	"answers",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		responseId: uuid("response_id")
			.notNull()
			.references(() => responses.id, { onDelete: "cascade" }),
		questionId: uuid("question_id")
			.notNull()
			.references(() => questions.id, { onDelete: "cascade" }),
		optionId: uuid("option_id")
			.notNull()
			.references(() => options.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => [
		index("answers_option_created_at_idx").on(table.optionId, table.createdAt),
		index("answers_question_option_idx").on(table.questionId, table.optionId),
		uniqueIndex("answers_response_option_unique").on(table.responseId, table.optionId),
	],
);
