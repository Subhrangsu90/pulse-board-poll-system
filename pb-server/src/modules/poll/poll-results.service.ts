import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../common/config/db";
import { notFound } from "../../common/utils/api.error";
import { answers } from "./model/answers.model";
import { options } from "./model/options.model";
import { polls } from "./model/polls.model";
import { questions } from "./model/questions.model";
import { responses } from "./model/responses.model";
import { getPollLiveMetrics } from "./realtime/redis-counter.service";

export const getPollResults = async (pollId: string, creatorId: string) => {
	const [poll] = await db
		.select()
		.from(polls)
		.where(and(eq(polls.id, pollId), eq(polls.creatorId, creatorId)))
		.limit(1);

	if (!poll) {
		throw notFound("Poll not found.");
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

	const optionIds = pollOptions.map((option) => option.id);

	const [
		liveMetrics,
		optionSelectionCountsDb,
		questionResponseCountsDb,
		dbResponsesCount,
		lastResponse,
		recentResponses,
	] = await Promise.all([
		optionIds.length > 0 ? getPollLiveMetrics(poll.id, optionIds) : Promise.resolve({
			pollId: poll.id,
			liveCounts: {} as Record<string, number>,
			totalVotes: 0,
			activeViewers: 0,
			regions: {} as Record<string, number>,
		}),
		db
			.select({
				optionId: answers.optionId,
				count: count(answers.id),
			})
			.from(answers)
			.innerJoin(responses, eq(answers.responseId, responses.id))
			.where(eq(responses.pollId, poll.id))
			.groupBy(answers.optionId),
		db
			.select({
				questionId: answers.questionId,
				count: sql<number>`count(distinct ${answers.responseId})`,
			})
			.from(answers)
			.innerJoin(responses, eq(answers.responseId, responses.id))
			.where(eq(responses.pollId, poll.id))
			.groupBy(answers.questionId),
		db
			.select({
				total: count(responses.id),
				anonymous: count(sql`case when ${responses.isAnonymous} = true then 1 end`),
				authenticated: count(sql`case when ${responses.isAnonymous} = false then 1 end`),
			})
			.from(responses)
			.where(eq(responses.pollId, poll.id)),
		db
			.select({
				submittedAt: responses.submittedAt,
			})
			.from(responses)
			.where(eq(responses.pollId, poll.id))
			.orderBy(desc(responses.submittedAt))
			.limit(1),
		db
			.select({
				id: responses.id,
				submittedAt: responses.submittedAt,
				isAnonymous: responses.isAnonymous,
			})
			.from(responses)
			.where(eq(responses.pollId, poll.id))
			.orderBy(desc(responses.submittedAt))
			.limit(10),
	]);

	const recentResponseIds = recentResponses.map((r) => r.id);
	const recentAnswersCountDb = recentResponseIds.length > 0
		? await db
				.select({
					responseId: answers.responseId,
					count: count(answers.id),
				})
				.from(answers)
				.where(inArray(answers.responseId, recentResponseIds))
				.groupBy(answers.responseId)
		: [];

	const recentAnswersCountMap = new Map<string, number>(
		recentAnswersCountDb.map((row) => [row.responseId, Number(row.count ?? 0)])
	);

	const optionSelectionCounts = new Map<string, number>(
		optionSelectionCountsDb.map((row) => [row.optionId, Number(row.count ?? 0)])
	);

	const questionResponseCounts = new Map<string, number>(
		questionResponseCountsDb.map((row) => [row.questionId, Number(row.count ?? 0)])
	);

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
			responseCount: Math.max(questionResponseCounts.get(question.id) ?? 0, liveMetrics.totalVotes),
			totalSelections,
			options: optionsWithCounts.map((option) => ({
				...option,
				percentage: totalSelections === 0 ? 0 : Math.round((option.selectionCount / totalSelections) * 100),
			})),
		};
	});

	const totalSelectionsAllQuestions = questionsWithResults.reduce((total, q) => total + q.totalSelections, 0);
	const summaryStats = dbResponsesCount[0] ?? { total: 0, anonymous: 0, authenticated: 0 };
	const lastResponseTime = lastResponse[0]?.submittedAt ?? null;

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
			totalResponses: Math.max(Number(summaryStats.total ?? 0), liveMetrics.totalVotes),
			totalAnswerSelections: totalSelectionsAllQuestions,
			anonymousResponses: Number(summaryStats.anonymous ?? 0),
			authenticatedResponses: Number(summaryStats.authenticated ?? 0),
			lastSubmittedAt: lastResponseTime,
			activeViewers: liveMetrics.activeViewers,
			regions: liveMetrics.regions,
		},
		questions: questionsWithResults,
		recentResponses: recentResponses.map((response) => ({
			id: response.id,
			submittedAt: response.submittedAt,
			isAnonymous: response.isAnonymous,
			answerCount: recentAnswersCountMap.get(response.id) ?? 0,
			status: "recorded" as const,
		})),
	};
};

export const getPublicPollBySlug = async (publicSlug: string) => {
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

export const getPublicPollResultsBySlug = async (publicSlug: string) => {
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

export const getPublicPollLiveMetrics = async (publicSlug: string) => {
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
