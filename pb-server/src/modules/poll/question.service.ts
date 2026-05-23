import { and, eq } from "drizzle-orm";
import { db } from "../../common/config/db";
import { internal, notFound } from "../../common/utils/api.error";
import type { QuestionInput } from "./dto/questions.dto";
import { options } from "./model/options.model";
import { polls } from "./model/polls.model";
import { questions } from "./model/questions.model";
import { createQuestionWithOptions } from "./poll-crud.service";

export const addQuestionToPoll = async (pollId: string, creatorId: string, input: QuestionInput) => {
	const [poll] = await db
		.select({ id: polls.id })
		.from(polls)
		.where(and(eq(polls.id, pollId), eq(polls.creatorId, creatorId)))
		.limit(1);

	if (!poll) {
		throw notFound("Poll not found.");
	}

	return db.transaction((tx) => createQuestionWithOptions(tx, poll.id, input, input.orderIndex ?? 0));
};

export const updateQuestion = async (questionId: string, creatorId: string, input: QuestionInput) => {
	const [question] = await db
		.select({
			id: questions.id,
			pollId: questions.pollId,
			orderIndex: questions.orderIndex,
		})
		.from(questions)
		.innerJoin(polls, eq(questions.pollId, polls.id))
		.where(and(eq(questions.id, questionId), eq(polls.creatorId, creatorId)))
		.limit(1);

	if (!question) {
		throw notFound("Question not found.");
	}

	return db.transaction(async (tx) => {
		const [updatedQuestion] = await tx
			.update(questions)
			.set({
				questionText: input.questionText,
				questionType: input.questionType,
				isRequired: input.isRequired,
				orderIndex: input.orderIndex ?? question.orderIndex,
				updatedAt: new Date(),
			})
			.where(eq(questions.id, questionId))
			.returning();

		if (!updatedQuestion) {
			throw internal("Unable to update question.");
		}

		await tx.delete(options).where(eq(options.questionId, questionId));

		const updatedOptions = await tx
			.insert(options)
			.values(
				input.options.map((option, optionIndex) => ({
					questionId,
					optionText: option.optionText,
					orderIndex: option.orderIndex ?? optionIndex,
				}))
			)
			.returning();

		return {
			...updatedQuestion,
			options: updatedOptions,
		};
	});
};

export const deleteQuestion = async (questionId: string, creatorId: string) => {
	const [question] = await db
		.select({ id: questions.id })
		.from(questions)
		.innerJoin(polls, eq(questions.pollId, polls.id))
		.where(and(eq(questions.id, questionId), eq(polls.creatorId, creatorId)))
		.limit(1);

	if (!question) {
		throw notFound("Question not found.");
	}

	const [deletedQuestion] = await db.delete(questions).where(eq(questions.id, questionId)).returning();

	return deletedQuestion;
};
