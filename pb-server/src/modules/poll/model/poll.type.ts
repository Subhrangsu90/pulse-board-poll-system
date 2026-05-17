import { z } from "zod";

export const responseModeSchema = z.enum(["anonymous", "authenticated"]);

export const createPollBodySchema = z.object({
	title: z.string().trim().min(1, "Title is required.").max(255),
	description: z.string().trim().optional(),
	tags: z
		.array(z.string().trim())
		.optional()
		.transform((tags) => tags?.filter(Boolean) ?? []),
	responseMode: responseModeSchema,
	expiresAt: z.coerce
		.date({
			error: "expiresAt must be a valid date.",
		})
		.refine((date) => date > new Date(), "expiresAt must be in the future."),
	isPublished: z.boolean().optional().default(false),
	publicSlug: z.string().trim().min(1, "Slug must not be empty.").optional(),
});

export type CreatePollBody = z.infer<typeof createPollBodySchema>;

export type CreatePollInput = CreatePollBody & {
	creatorId: string;
};
