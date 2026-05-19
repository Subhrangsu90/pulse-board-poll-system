import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, lte } from "drizzle-orm";
import { db } from "../../common/config/db";
import { badRequest, internal, notFound } from "../../common/utils/api.error";
import type { CreatePollInput, UpdatePollInput } from "./dto/polls.dto";
import type { QuestionInput } from "./dto/questions.dto";
import { options } from "./model/options.model";
import { polls } from "./model/polls.model";
import { questions } from "./model/questions.model";

type PollTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function normalizePublicSlug(value?: string): string {
	if (value !== undefined) {
		return value;
	}

	return randomUUID();
}

const createQuestionWithOptions = async (
	tx: PollTransaction,
	pollId: string,
	input: QuestionInput,
	fallbackOrderIndex: number
) => {
	const [createdQuestion] = await tx
		.insert(questions)
		.values({
			pollId,
			questionText: input.questionText,
			questionType: input.questionType,
			isRequired: input.isRequired,
			orderIndex: input.orderIndex ?? fallbackOrderIndex,
		})
		.returning();

	if (!createdQuestion) {
		throw internal("Unable to create question.");
	}

	const createdOptions = await tx
		.insert(options)
		.values(
			input.options.map((option, optionIndex) => ({
				questionId: createdQuestion.id,
				optionText: option.optionText,
				orderIndex: option.orderIndex ?? optionIndex,
			}))
		)
		.returning();

	return {
		...createdQuestion,
		options: createdOptions,
	};
};

const createPoll = async (input: CreatePollInput) => {
	return db.transaction(async (tx) => {
		const [createdPoll] = await tx
			.insert(polls)
			.values({
				creatorId: input.creatorId,
				title: input.title,
				description: input.description || null,
				tags: input.tags,
				responseMode: input.responseMode,
				expiresAt: input.expiresAt,
				isPublished: false,
				status: "draft",
				publicSlug: normalizePublicSlug(input.publicSlug),
			})
			.returning();

		if (!createdPoll) {
			throw internal("Unable to create poll.");
		}

		const createdQuestions = [];

		for (const [questionIndex, question] of input.questions.entries()) {
			createdQuestions.push(
				await createQuestionWithOptions(tx, createdPoll.id, question, questionIndex)
			);
		}

		return {
			...createdPoll,
			questions: createdQuestions,
		};
	});
};

const addQuestionToPoll = async (pollId: string, creatorId: string, input: QuestionInput) => {
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

const getPollById = async (pollId: string, creatorId: string) => {
	const [poll] = await db
		.select()
		.from(polls)
		.where(and(eq(polls.id, pollId), eq(polls.creatorId, creatorId)))
		.limit(1);

	if (!poll) {
		throw notFound("Poll not found.");
	}

	const pollQuestions = await db
		.select()
		.from(questions)
		.where(eq(questions.pollId, poll.id))
		.orderBy(asc(questions.orderIndex));

	if (pollQuestions.length === 0) {
		return {
			...poll,
			questions: [],
		};
	}

	const questionIds = pollQuestions.map((question) => question.id);
	const pollOptions = await db
		.select()
		.from(options)
		.where(inArray(options.questionId, questionIds))
		.orderBy(asc(options.orderIndex));

	return {
		...poll,
		questions: pollQuestions.map((question) => ({
			...question,
			options: pollOptions.filter((option) => option.questionId === question.id),
		})),
	};
};

const getPublicPollBySlug = async (publicSlug: string) => {
	await expireDuePolls();

	const [poll] = await db
		.select()
		.from(polls)
		.where(
			and(
				eq(polls.publicSlug, publicSlug),
				eq(polls.status, "active"),
				eq(polls.isPublished, true)
			)
		)
		.limit(1);

	if (!poll) {
		throw notFound("Poll not found or not published.");
	}

	const pollQuestions = await db
		.select()
		.from(questions)
		.where(eq(questions.pollId, poll.id))
		.orderBy(asc(questions.orderIndex));

	const questionIds = pollQuestions.map((question) => question.id);
	const pollOptions =
		questionIds.length > 0
			? await db
					.select()
					.from(options)
					.where(inArray(options.questionId, questionIds))
					.orderBy(asc(options.orderIndex))
			: [];

	return {
		id: poll.id,
		title: poll.title,
		description: poll.description,
		tags: poll.tags,
		responseMode: poll.responseMode,
		expiresAt: poll.expiresAt,
		publicSlug: poll.publicSlug,
		questions: pollQuestions.map((question) => ({
			id: question.id,
			questionText: question.questionText,
			questionType: question.questionType,
			isRequired: question.isRequired,
			orderIndex: question.orderIndex,
			options: pollOptions
				.filter((option) => option.questionId === question.id)
				.map((option) => ({
					id: option.id,
					optionText: option.optionText,
					orderIndex: option.orderIndex,
				})),
		})),
	};
};

const updateQuestion = async (questionId: string, creatorId: string, input: QuestionInput) => {
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

const deleteQuestion = async (questionId: string, creatorId: string) => {
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

const updatePoll = async (input: UpdatePollInput) => {
	const [updatedPoll] = await db
		.update(polls)
		.set({
			...(input.title !== undefined ? { title: input.title } : {}),
			...(input.description !== undefined ? { description: input.description || null } : {}),
			...(input.tags !== undefined ? { tags: input.tags } : {}),
			...(input.responseMode !== undefined ? { responseMode: input.responseMode } : {}),
			...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
			...(input.publicSlug !== undefined ? { publicSlug: input.publicSlug } : {}),
			updatedAt: new Date(),
		})
		.where(and(eq(polls.id, input.pollId), eq(polls.creatorId, input.creatorId)))
		.returning();

	if (!updatedPoll) {
		throw notFound("Poll not found.");
	}

	return updatedPoll;
};

const publishPoll = async (pollId: string, creatorId: string) => {
	const [poll] = await db
		.select()
		.from(polls)
		.where(and(eq(polls.id, pollId), eq(polls.creatorId, creatorId)))
		.limit(1);

	if (!poll) {
		throw notFound("Poll not found.");
	}

	if (poll.expiresAt <= new Date()) {
		throw badRequest("Poll expiration date must be in the future.");
	}

	const pollQuestions = await db
		.select({ id: questions.id })
		.from(questions)
		.where(eq(questions.pollId, poll.id));

	if (pollQuestions.length === 0) {
		throw badRequest("Add at least one question before publishing.");
	}

	const questionIds = pollQuestions.map((question) => question.id);
	const pollOptions = await db
		.select({ questionId: options.questionId })
		.from(options)
		.where(inArray(options.questionId, questionIds));

	const optionCounts = new Map<string, number>();

	for (const option of pollOptions) {
		optionCounts.set(option.questionId, (optionCounts.get(option.questionId) ?? 0) + 1);
	}

	const hasInvalidQuestion = questionIds.some((questionId) => (optionCounts.get(questionId) ?? 0) < 2);

	if (hasInvalidQuestion) {
		throw badRequest("Each question must have at least two options before publishing.");
	}

	const [publishedPoll] = await db
		.update(polls)
		.set({
			status: "active",
			isPublished: true,
			updatedAt: new Date(),
		})
		.where(and(eq(polls.id, pollId), eq(polls.creatorId, creatorId)))
		.returning();

	if (!publishedPoll) {
		throw internal("Unable to publish poll.");
	}

	return publishedPoll;
};

const deletePoll = async (pollId: string, creatorId: string) => {
	const [deletedPoll] = await db
		.delete(polls)
		.where(and(eq(polls.id, pollId), eq(polls.creatorId, creatorId)))
		.returning();

	if (!deletedPoll) {
		throw notFound("Poll not found.");
	}

	return deletedPoll;
};

const completePoll = async (pollId: string, creatorId: string) => {
	const [completedPoll] = await db
		.update(polls)
		.set({
			status: "completed",
			isPublished: false,
			updatedAt: new Date(),
		})
		.where(and(eq(polls.id, pollId), eq(polls.creatorId, creatorId)))
		.returning();

	if (!completedPoll) {
		throw notFound("Poll not found.");
	}

	return completedPoll;
};

const expireDuePolls = async () => {
	return db
		.update(polls)
		.set({
			status: "expired",
			isPublished: false,
			updatedAt: new Date(),
		})
		.where(and(eq(polls.status, "active"), lte(polls.expiresAt, new Date())))
		.returning();
};

const getAllPolls = async (creatorId: string) => {
	await expireDuePolls();

	return db
		.select()
		.from(polls)
		.where(eq(polls.creatorId, creatorId))
		.orderBy(desc(polls.createdAt));
};

export {
	addQuestionToPoll,
	completePoll,
	createPoll,
	deleteQuestion,
	deletePoll,
	expireDuePolls,
	getAllPolls,
	getPollById,
	getPublicPollBySlug,
	publishPoll,
	updateQuestion,
	updatePoll,
};
export type { CreatePollInput };
