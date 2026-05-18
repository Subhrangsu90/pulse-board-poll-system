import { z } from "zod";

export const optionSchema = z
	.object({
		optionText: z
			.string()
			.trim()
			.min(1, "Option text is required.")
			.max(255, "Option text must be less than 255 characters.")
			.describe("Display text for the option."),

		orderIndex: z
			.number()
			.int()
			.min(0, "Order index must be positive.")
			.optional()
			.describe("Controls the display order of the option."),
	})
	.describe("Represents a selectable option for a poll question.");

export type OptionInput = z.infer<typeof optionSchema>;
