import { z } from "zod";

export const responseAnswerSchema = z
	.object({
		questionId: z.uuid("Question id must be a valid UUID."),
		optionIds: z
			.array(z.uuid("Option id must be a valid UUID."))
			.min(1, "Select at least one option.")
			.max(20, "Too many options selected."),
	})
	.superRefine((answer, ctx) => {
		const uniqueOptionIds = new Set(answer.optionIds);

		if (uniqueOptionIds.size !== answer.optionIds.length) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Duplicate option selections are not allowed.",
				path: ["optionIds"],
			});
		}
	});

export const submitPollResponseBodySchema = z.object({
	answers: z
		.array(responseAnswerSchema)
		.min(1, "Submit at least one answer.")
		.max(50, "Too many answers submitted.")
		.superRefine((answers, ctx) => {
			const questionIds = answers.map((answer) => answer.questionId);
			const uniqueQuestionIds = new Set(questionIds);

			if (uniqueQuestionIds.size !== questionIds.length) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Each question can only be answered once.",
				});
			}
		}),
});

export type SubmitPollResponseBody = z.infer<typeof submitPollResponseBodySchema>;

export type SubmitPollResponseInput = SubmitPollResponseBody & {
	publicSlug: string;
	userId?: string | null;
	anonymousIdentifier?: string | null;
	ipAddress?: string | null;
};
