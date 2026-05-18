import { z } from "zod";
import { optionSchema } from "./options.dto";

export const questionTypeSchema = z
	.enum(["single_choice", "multiple_choice"])
	.describe("Determines whether users can select one or multiple options.");

export const questionSchema = z
	.object({
		questionText: z
			.string()
			.trim()
			.min(1, "Question is required.")
			.max(1000, "Question is too long.")
			.describe("Main text content of the question."),

		questionType: questionTypeSchema
			.default("single_choice")
			.describe("Specifies whether the question allows single or multiple selections."),

		isRequired: z
			.boolean()
			.optional()
			.default(true)
			.describe("Indicates whether answering the question is mandatory."),

		orderIndex: z
			.number()
			.int()
			.min(0, "Order index must be positive.")
			.optional()
			.describe("Controls the display order of the question within the poll."),

		options: z
			.array(optionSchema)
			.min(2, "At least 2 options are required.")
			.max(20, "Maximum 20 options allowed.")
			.describe("List of selectable options for the question."),
	})
	.superRefine((question, ctx) => {
		const normalizedOptions = question.options.map((opt) => opt.optionText.trim().toLowerCase());

		const duplicates = normalizedOptions.filter(
			(item, index) => normalizedOptions.indexOf(item) !== index
		);

		if (duplicates.length > 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Duplicate options are not allowed.",
				path: ["options"],
			});
		}
	})
	.describe("Represents a poll question with selectable options.");

export type QuestionInput = z.infer<typeof questionSchema>;
