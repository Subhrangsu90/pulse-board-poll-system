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

		publicSlug: z
			.string()
			.trim()
			.min(1, "Slug must not be empty.")
			.optional()
			.describe("Public unique slug used in poll URLs."),

		questions: z
			.array(questionSchema)
			.max(50, "Maximum 50 questions allowed.")
			.optional()
			.default([])
			.describe("Collection of questions included in the poll."),
	})
	.describe("Schema for creating a draft poll.");

export const updatePollBodySchema = z
	.object({
		title: z.string().trim().min(1, "Title is required.").max(255).optional(),

		description: z.string().trim().optional(),

		tags: z
			.array(z.string().trim())
			.optional()
			.transform((tags) => tags?.filter(Boolean)),

		responseMode: responseModeSchema.optional(),

		expiresAt: z.coerce
			.date({
				error: "expiresAt must be a valid date.",
			})
			.refine((date) => date > new Date(), "expiresAt must be in the future.")
			.optional(),

		publicSlug: z.string().trim().min(1, "Slug must not be empty.").optional(),
	})
	.refine((body) => Object.keys(body).length > 0, "At least one field is required.")
	.describe("Schema for updating poll details.");

export type CreatePollBody = z.infer<typeof createPollBodySchema>;
export type UpdatePollBody = z.infer<typeof updatePollBodySchema>;

export type CreatePollInput = CreatePollBody & {
	creatorId: string;
};

export type UpdatePollInput = UpdatePollBody & {
	creatorId: string;
	pollId: string;
};

export type PollStatus = z.infer<typeof pollStatusSchema>;
