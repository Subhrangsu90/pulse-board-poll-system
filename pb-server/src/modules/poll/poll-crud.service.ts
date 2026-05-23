import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, count } from "drizzle-orm";
import { db } from "../../common/config/db";
import { internal, notFound } from "../../common/utils/api.error";
import type { CreatePollInput, UpdatePollInput } from "./dto/polls.dto";
import type { QuestionInput } from "./dto/questions.dto";
import { options } from "./model/options.model";
import { polls } from "./model/polls.model";
import { questions } from "./model/questions.model";
import { responses } from "./model/responses.model";

type PollTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function normalizePublicSlug(value?: string): string {
	if (value !== undefined) {
		return value;
	}

	return randomUUID();
}

export const createQuestionWithOptions = async (
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

export const createPoll = async (input: CreatePollInput) => {
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

export const getPollById = async (pollId: string, creatorId: string) => {
	const [poll] = await db
		.select()
		.from(polls)
		.where(and(eq(polls.id, pollId), eq(polls.creatorId, creatorId)))
		.limit(1);

	if (!poll) {
		throw notFound("Poll not found.");
	}

	const [pollQuestions, pollOptionsResult] = await Promise.all([
		db
			.select()
			.from(questions)
			.where(eq(questions.pollId, poll.id))
			.orderBy(asc(questions.orderIndex)),
		db
			.select()
			.from(options)
			.innerJoin(questions, eq(options.questionId, questions.id))
			.where(eq(questions.pollId, poll.id))
			.orderBy(asc(options.orderIndex)),
	]);

	const pollOptions = pollOptionsResult.map((r) => r.options);

	return {
		...poll,
		questions: pollQuestions.map((question) => ({
			...question,
			options: pollOptions.filter((option) => option.questionId === question.id),
		})),
	};
};

export const updatePoll = async (input: UpdatePollInput) => {
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

export const deletePoll = async (pollId: string, creatorId: string) => {
	const [deletedPoll] = await db
		.delete(polls)
		.where(and(eq(polls.id, pollId), eq(polls.creatorId, creatorId)))
		.returning();

	if (!deletedPoll) {
		throw notFound("Poll not found.");
	}

	return deletedPoll;
};

export const getAllPolls = async (creatorId: string) => {
	return db
		.select()
		.from(polls)
		.where(eq(polls.creatorId, creatorId))
		.orderBy(desc(polls.createdAt));
};

export const getPollsSummary = async (creatorId: string) => {
	const [responseCount] = await db
		.select({ totalResponses: count(responses.id) })
		.from(responses)
		.innerJoin(polls, eq(responses.pollId, polls.id))
		.where(eq(polls.creatorId, creatorId));

	const creatorPolls = await db
		.select({ status: polls.status })
		.from(polls)
		.where(eq(polls.creatorId, creatorId));

	return {
		totalResponses: Number(responseCount?.totalResponses ?? 0),
		totalPolls: creatorPolls.length,
		activePolls: creatorPolls.filter((poll) => poll.status === "active").length,
		draftPolls: creatorPolls.filter((poll) => poll.status === "draft").length,
		completedPolls: creatorPolls.filter((poll) => poll.status === "completed").length,
	};
};

export type { CreatePollInput };
