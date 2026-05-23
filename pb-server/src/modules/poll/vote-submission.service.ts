import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../common/config/db";
import { badRequest, conflict, notFound, unauthorized } from "../../common/utils/api.error";
import type { SubmitPollResponseInput } from "./dto/responses.dto";
import { options } from "./model/options.model";
import { polls } from "./model/polls.model";
import { questions } from "./model/questions.model";
import { responseSessions } from "./model/responseSessions.model";
import {
	claimVoteOnce,
	releaseVoteClaim,
} from "./realtime/duplicate-vote.service";
import { enqueueVote } from "./realtime/vote.queue";
import {
	incrementVoteCounters,
	rollbackVoteCounters,
} from "./realtime/redis-counter.service";
import { publishPollAnalytics, publishVoteEvents } from "./realtime/realtime-broadcast.service";
import { recordVoteAnalytics } from "./realtime/vote-analytics.service";
import type { VoteAcceptedResult } from "./realtime/vote.types";

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

export const submitPublicPollResponse = async (
	input: SubmitPollResponseInput & { deviceFingerprint: string }
): Promise<VoteAcceptedResult> => {
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

	const [pollQuestions, pollOptionsResult, alreadyPersisted] = await Promise.all([
		db
			.select()
			.from(questions)
			.where(eq(questions.pollId, poll.id))
			.orderBy(asc(questions.orderIndex)),
		db
			.select()
			.from(options)
			.innerJoin(questions, eq(options.questionId, questions.id))
			.where(eq(questions.pollId, poll.id)),
		hasPersistedVoteSession({
			pollId: poll.id,
			isAnonymous,
			userId: input.userId,
			anonymousIdentifier: input.anonymousIdentifier,
		}),
	]);

	if (pollQuestions.length === 0) {
		throw badRequest("This poll has no questions.");
	}

	const pollOptions = pollOptionsResult.map((r) => r.options);

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
