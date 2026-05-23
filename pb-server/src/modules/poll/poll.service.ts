import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, inArray, lte } from "drizzle-orm";
import { db } from "../../common/config/db";
import { badRequest, conflict, internal, notFound, unauthorized } from "../../common/utils/api.error";
import { logger } from "../../common/utils/logger";
import type { CreatePollInput, UpdatePollInput } from "./dto/polls.dto";
import type { QuestionInput } from "./dto/questions.dto";
import type { SubmitPollResponseInput } from "./dto/responses.dto";
import { answers } from "./model/answers.model";
import { options } from "./model/options.model";
import { polls } from "./model/polls.model";
import { questions } from "./model/questions.model";
import { responseSessions } from "./model/responseSessions.model";
import { responses } from "./model/responses.model";
import {
	claimVoteOnce,
	releaseVoteClaim,
} from "./realtime/duplicate-vote.service";
import { enqueueVote, getVoteQueueHealth } from "./realtime/vote.queue";
import {
	getPollLiveMetrics,
	incrementVoteCounters,
	rollbackVoteCounters,
} from "./realtime/redis-counter.service";
import { publishPollAnalytics, publishVoteEvents } from "./realtime/realtime-broadcast.service";
import { recordVoteAnalytics } from "./realtime/vote-analytics.service";
import type { VoteAcceptedResult } from "./realtime/vote.types";

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

const getPollResults = async (pollId: string, creatorId: string) => {
	expireDuePolls().catch((err) => logger.error(err));

	const [poll] = await db
		.select()
		.from(polls)
		.where(and(eq(polls.id, pollId), eq(polls.creatorId, creatorId)))
		.limit(1);

	if (!poll) {
		throw notFound("Poll not found.");
	}

	const [pollQuestions, pollOptions, dbResponses] = await Promise.all([
		db
			.select()
			.from(questions)
			.where(eq(questions.pollId, poll.id))
			.orderBy(asc(questions.orderIndex)),
		db
			.select({
				id: options.id,
				questionId: options.questionId,
				optionText: options.optionText,
				orderIndex: options.orderIndex,
			})
			.from(options)
			.innerJoin(questions, eq(options.questionId, questions.id))
			.where(eq(questions.pollId, poll.id))
			.orderBy(asc(options.orderIndex)),
		db
			.select()
			.from(responses)
			.where(eq(responses.pollId, poll.id))
			.orderBy(desc(responses.submittedAt)),
	]);

	const optionIds = pollOptions.map((option) => option.id);
	const responseIds = dbResponses.map((response) => response.id);

	const [liveMetrics, dbAnswers] = await Promise.all([
		getPollLiveMetrics(poll.id, optionIds),
		responseIds.length > 0
			? db.select().from(answers).where(inArray(answers.responseId, responseIds))
			: Promise.resolve([]),
	]);

	const optionSelectionCounts = new Map<string, number>();
	const responseIdsByQuestion = new Map<string, Set<string>>();

	for (const answer of dbAnswers) {
		optionSelectionCounts.set(
			answer.optionId,
			(optionSelectionCounts.get(answer.optionId) ?? 0) + 1
		);

		const responseSet = responseIdsByQuestion.get(answer.questionId) ?? new Set<string>();
		responseSet.add(answer.responseId);
		responseIdsByQuestion.set(answer.questionId, responseSet);
	}

	const questionsWithResults = pollQuestions.map((question) => {
		const questionOptions = pollOptions.filter((option) => option.questionId === question.id);
		const optionsWithCounts = questionOptions.map((option) => ({
			id: option.id,
			optionText: option.optionText,
			orderIndex: option.orderIndex,
			selectionCount: Math.max(
				optionSelectionCounts.get(option.id) ?? 0,
				liveMetrics.liveCounts[option.id] ?? 0
			),
			percentage: 0,
		}));
		const totalSelections = optionsWithCounts.reduce(
			(total, option) => total + option.selectionCount,
			0
		);

		return {
			id: question.id,
			questionText: question.questionText,
			questionType: question.questionType,
			isRequired: question.isRequired,
			orderIndex: question.orderIndex,
			responseCount: Math.max(responseIdsByQuestion.get(question.id)?.size ?? 0, liveMetrics.totalVotes),
			totalSelections,
			options: optionsWithCounts.map((option) => ({
				...option,
				percentage: totalSelections === 0 ? 0 : Math.round((option.selectionCount / totalSelections) * 100),
			})),
		};
	});

	return {
		poll: {
			id: poll.id,
			title: poll.title,
			description: poll.description,
			tags: poll.tags,
			responseMode: poll.responseMode,
			expiresAt: poll.expiresAt,
			status: poll.status,
			publicSlug: poll.publicSlug,
			createdAt: poll.createdAt,
			updatedAt: poll.updatedAt,
		},
		summary: {
			totalResponses: Math.max(dbResponses.length, liveMetrics.totalVotes),
			totalAnswerSelections: Math.max(dbAnswers.length, questionsWithResults.reduce((total, question) => total + question.totalSelections, 0)),
			anonymousResponses: dbResponses.filter((response) => response.isAnonymous).length,
			authenticatedResponses: dbResponses.filter((response) => !response.isAnonymous).length,
			lastSubmittedAt: dbResponses[0]?.submittedAt ?? null,
			activeViewers: liveMetrics.activeViewers,
			regions: liveMetrics.regions,
		},
		questions: questionsWithResults,
		recentResponses: dbResponses.slice(0, 10).map((response) => ({
			id: response.id,
			submittedAt: response.submittedAt,
			isAnonymous: response.isAnonymous,
			answerCount: dbAnswers.filter((answer) => answer.responseId === response.id).length,
			status: "recorded" as const,
		})),
	};
};

const getPublicPollBySlug = async (publicSlug: string) => {
	expireDuePolls().catch((err) => logger.error(err));

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

	const [pollQuestions, pollOptions] = await Promise.all([
		db
			.select()
			.from(questions)
			.where(eq(questions.pollId, poll.id))
			.orderBy(asc(questions.orderIndex)),
		db
			.select({
				id: options.id,
				questionId: options.questionId,
				optionText: options.optionText,
				orderIndex: options.orderIndex,
			})
			.from(options)
			.innerJoin(questions, eq(options.questionId, questions.id))
			.where(eq(questions.pollId, poll.id))
			.orderBy(asc(options.orderIndex)),
	]);

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

const getPublicPollResultsBySlug = async (publicSlug: string) => {
	expireDuePolls().catch((err) => logger.error(err));

	const [poll] = await db
		.select({ id: polls.id, creatorId: polls.creatorId, status: polls.status, isPublished: polls.isPublished })
		.from(polls)
		.where(eq(polls.publicSlug, publicSlug))
		.limit(1);

	if (!poll || poll.status === "draft") {
		throw notFound("Poll results are not available.");
	}

	// Public result pages are available after the poll starts, including live active polls
	// and final expired/completed polls.
	if (!poll.isPublished && poll.status === "active") {
		throw notFound("Poll results are not available.");
	}

	return getPollResults(poll.id, poll.creatorId);
};

const hasPersistedVoteSession = async (input: {
	pollId: string;
	isAnonymous: boolean;
	userId?: string | null;
	anonymousIdentifier?: string | null;
}) => {
	const existingSessions = await db
		.select({ id: responseSessions.id })
		.from(responseSessions)
		.where(
			input.isAnonymous
				? and(
						eq(responseSessions.pollId, input.pollId),
						eq(responseSessions.anonymousIdentifier, input.anonymousIdentifier!)
					)
				: and(eq(responseSessions.pollId, input.pollId), eq(responseSessions.userId, input.userId!))
		)
		.limit(1);

	return existingSessions.length > 0;
};

const submitPublicPollResponse = async (
	input: SubmitPollResponseInput & { deviceFingerprint: string }
): Promise<VoteAcceptedResult> => {
	expireDuePolls().catch((err) => logger.error(err));

	const [poll] = await db
		.select()
		.from(polls)
		.where(
			and(
				eq(polls.publicSlug, input.publicSlug),
				eq(polls.status, "active"),
				eq(polls.isPublished, true)
			)
		)
		.limit(1);

	if (!poll) {
		throw notFound("Poll not found or not published.");
	}

	const requiresAuthentication = poll.responseMode === "authenticated";
	const isAnonymous = !input.userId;

	if (requiresAuthentication && !input.userId) {
		throw unauthorized("Authentication required to submit this poll.");
	}

	if (isAnonymous && !input.anonymousIdentifier) {
		throw badRequest("Anonymous response session is required.");
	}

	const pollQuestions = await db
		.select()
		.from(questions)
		.where(eq(questions.pollId, poll.id))
		.orderBy(asc(questions.orderIndex));

	if (pollQuestions.length === 0) {
		throw badRequest("This poll has no questions.");
	}

	const questionIds = pollQuestions.map((question) => question.id);
	const pollOptions = await db
		.select()
		.from(options)
		.where(inArray(options.questionId, questionIds));

	const questionsById = new Map(pollQuestions.map((question) => [question.id, question]));
	const optionsByQuestionId = new Map<string, Set<string>>();

	for (const option of pollOptions) {
		const optionIds = optionsByQuestionId.get(option.questionId) ?? new Set<string>();
		optionIds.add(option.id);
		optionsByQuestionId.set(option.questionId, optionIds);
	}

	const submittedAnswers = new Map(
		input.answers.map((answer) => [answer.questionId, answer.optionIds])
	);

	for (const question of pollQuestions) {
		const selectedOptionIds = submittedAnswers.get(question.id) ?? [];

		if (question.isRequired && selectedOptionIds.length === 0) {
			throw badRequest("Please answer all required questions.");
		}

		if (question.questionType === "single_choice" && selectedOptionIds.length > 1) {
			throw badRequest("Single choice questions only accept one option.");
		}
	}

	for (const [questionId, optionIds] of submittedAnswers) {
		if (!questionsById.has(questionId)) {
			throw badRequest("Answer contains a question that does not belong to this poll.");
		}

		const allowedOptionIds = optionsByQuestionId.get(questionId) ?? new Set<string>();

		for (const optionId of optionIds) {
			if (!allowedOptionIds.has(optionId)) {
				throw badRequest("Answer contains an option that does not belong to its question.");
			}
		}
	}

	const alreadyPersisted = await hasPersistedVoteSession({
		pollId: poll.id,
		isAnonymous,
		userId: input.userId,
		anonymousIdentifier: input.anonymousIdentifier,
	});

	if (alreadyPersisted) {
		throw conflict("This participant has already submitted a response.");
	}

	const didClaimVote = await claimVoteOnce(poll.id, input.deviceFingerprint);

	if (!didClaimVote) {
		throw conflict("This participant has already submitted a response.");
	}

	const selectedOptionIds = Array.from(submittedAnswers.values()).flat();

	try {
		const { liveCounts, totalVotes } = await incrementVoteCounters(
			poll.id,
			selectedOptionIds,
			poll.expiresAt
		);
		const submittedAt = new Date().toISOString();
		const submissionId = randomUUID();

		await publishVoteEvents(poll.id, liveCounts, totalVotes, {
			submissionId,
			isAnonymous,
			answerCount: selectedOptionIds.length,
			submittedAt,
		});
		await recordVoteAnalytics(poll.id, selectedOptionIds);
		await publishPollAnalytics(poll.id, { totalVotes });

		await enqueueVote({
			pollId: poll.id,
			publicSlug: poll.publicSlug ?? input.publicSlug,
			userId: isAnonymous ? null : (input.userId ?? null),
			anonymousIdentifier: isAnonymous ? (input.anonymousIdentifier ?? null) : null,
			isAnonymous,
			ipAddress: input.ipAddress ?? null,
			deviceFingerprint: input.deviceFingerprint,
			answers: input.answers,
			submittedAt,
		});

		return {
			pollId: poll.id,
			queued: true,
			isAnonymous,
			liveCounts,
			totalVotes,
		};
	} catch (error) {
		await rollbackVoteCounters(poll.id, selectedOptionIds);
		await releaseVoteClaim(poll.id, input.deviceFingerprint);
		throw error;
	}
};

const getPublicPollLiveMetrics = async (publicSlug: string) => {
	const pollRows = await db
		.select({
			pollId: polls.id,
			optionId: options.id,
		})
		.from(polls)
		.leftJoin(questions, eq(questions.pollId, polls.id))
		.leftJoin(options, eq(options.questionId, questions.id))
		.where(eq(polls.publicSlug, publicSlug));

	if (pollRows.length === 0 || !pollRows[0]?.pollId) {
		throw notFound("Poll not found.");
	}

	const pollId = pollRows[0].pollId;
	const optionIds = pollRows.map((row) => row.optionId).filter((id): id is string => id !== null);

	return getPollLiveMetrics(pollId, optionIds);
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
	expireDuePolls().catch((err) => logger.error(err));

	return db
		.select()
		.from(polls)
		.where(eq(polls.creatorId, creatorId))
		.orderBy(desc(polls.createdAt));
};

const getPollsSummary = async (creatorId: string) => {
	expireDuePolls().catch((err) => logger.error(err));

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

export {
	addQuestionToPoll,
	completePoll,
	createPoll,
	deleteQuestion,
	deletePoll,
	expireDuePolls,
	getAllPolls,
	getPollsSummary,
	getPollById,
	getPollResults,
	getPublicPollLiveMetrics,
	getPublicPollResultsBySlug,
	getVoteQueueHealth,
	getPublicPollBySlug,
	submitPublicPollResponse,
	publishPoll,
	updateQuestion,
	updatePoll,
};
export type { CreatePollInput };
