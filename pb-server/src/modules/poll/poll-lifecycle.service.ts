import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "../../common/config/db";
import { redis } from "../../common/config/redis";
import { badRequest, internal, notFound } from "../../common/utils/api.error";
import { logger } from "../../common/utils/logger";
import { polls } from "./model/polls.model";
import { questions } from "./model/questions.model";
import { options } from "./model/options.model";

export const publishPoll = async (pollId: string, creatorId: string) => {
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

export const completePoll = async (pollId: string, creatorId: string) => {
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

const REDIS_EXPIRE_LOCK_KEY = "poll:expire:lock";
const EXPIRE_LOCK_TTL_SECONDS = 30;

export const expireDuePolls = async () => {
	try {
		const acquired = await redis.set(
			REDIS_EXPIRE_LOCK_KEY,
			"locked",
			"EX",
			EXPIRE_LOCK_TTL_SECONDS,
			"NX"
		);
		if (!acquired) {
			return [];
		}
	} catch (err) {
		logger.error(err);
	}

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
