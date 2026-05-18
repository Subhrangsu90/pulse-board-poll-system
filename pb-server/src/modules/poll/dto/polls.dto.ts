import { z } from "zod";
import { questionSchema } from "./questions.dto";

export const responseModeSchema = z
	.enum(["anonymous", "authenticated"])
	.describe("Defines whether poll responses are anonymous or authenticated.");

export const pollStatusSchema = z
	.enum(["draft", "active", "expired", "completed"])
	.describe("Current lifecycle status of the poll.");

export const createPollBodySchema = z
	.object({
		title: z.string().trim().min(1, "Title is required.").max(255).describe("Title of the poll."),

		description: z
			.string()
			.trim()
			.optional()
			.describe("Optional detailed description of the poll."),

		tags: z
			.array(z.string().trim())
			.optional()
			.transform((tags) => tags?.filter(Boolean) ?? [])
			.describe("Optional list of tags associated with the poll."),

		responseMode: responseModeSchema.describe("Controls how users submit responses."),

		expiresAt: z.coerce
			.date({
				error: "expiresAt must be a valid date.",
			})
			.refine((date) => date > new Date(), "expiresAt must be in the future.")
			.describe("Expiration date and time for the poll."),

		isPublished: z
			.boolean()
			.optional()
			.default(false)
			.describe("Indicates whether the poll is publicly visible."),

		publicSlug: z
			.string()
			.trim()
			.min(1, "Slug must not be empty.")
			.optional()
			.describe("Public unique slug used in poll URLs."),

		questions: z
			.array(questionSchema)
			.min(1, "At least one question is required.")
			.max(50, "Maximum 50 questions allowed.")
			.describe("Collection of questions included in the poll."),
	})
	.describe("Schema for creating a poll with questions and options.");

export type CreatePollBody = z.infer<typeof createPollBodySchema>;

export type CreatePollInput = CreatePollBody & {
	creatorId: string;
};

export type PollStatus = z.infer<typeof pollStatusSchema>;
