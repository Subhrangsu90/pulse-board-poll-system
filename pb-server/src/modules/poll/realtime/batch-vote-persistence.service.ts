import { db } from "../../../common/config/db";
import { logger } from "../../../common/utils/logger";
import { env } from "../../../config/env";
import { answers } from "../model/answers.model";
import { responses } from "../model/responses.model";
import { responseSessions } from "../model/responseSessions.model";
import type { VoteQueuePayload } from "./vote.types";

type PendingVote = {
	payload: VoteQueuePayload;
	resolve: () => void;
	reject: (error: unknown) => void;
};

function participantKey(payload: VoteQueuePayload) {
	return payload.userId
		? `${payload.pollId}:user:${payload.userId}`
		: `${payload.pollId}:anonymous:${payload.anonymousIdentifier ?? payload.deviceFingerprint}`;
}

export class BatchVotePersistenceService {
	private pendingVotes: PendingVote[] = [];
	private flushTimer: NodeJS.Timeout | null = null;
	private flushing = false;

	add(payload: VoteQueuePayload) {
		return new Promise<void>((resolve, reject) => {
			this.pendingVotes.push({ payload, resolve, reject });

			if (this.pendingVotes.length >= env.voteBatchSize) {
				void this.flush();
				return;
			}

			this.scheduleFlush();
		});
	}

	async shutdown() {
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = null;
		}

		await this.flush();
	}

	private scheduleFlush() {
		if (this.flushTimer) {
			return;
		}

		this.flushTimer = setTimeout(() => {
			this.flushTimer = null;
			void this.flush();
		}, env.voteBatchFlushMs);
	}

	private async flush() {
		if (this.flushing || this.pendingVotes.length === 0) {
			return;
		}

		this.flushing = true;
		const batch = this.pendingVotes.splice(0, env.voteBatchSize);

		try {
			await persistVoteBatch(batch.map((item) => item.payload));
			batch.forEach((item) => item.resolve());
		} catch (error) {
			logger.error(error);
			batch.forEach((item) => item.reject(error));
		} finally {
			this.flushing = false;

			if (this.pendingVotes.length > 0) {
				this.scheduleFlush();
			}
		}
	}
}

async function persistVoteBatch(batch: VoteQueuePayload[]) {
	if (batch.length === 0) {
		return;
	}

	await db.transaction(async (tx) => {
		const insertedSessions = await tx
			.insert(responseSessions)
			.values(
				batch.map((payload) => ({
					pollId: payload.pollId,
					userId: payload.isAnonymous ? null : payload.userId,
					anonymousIdentifier: payload.isAnonymous
						? (payload.anonymousIdentifier ?? payload.deviceFingerprint)
						: null,
					createdAt: new Date(payload.submittedAt),
				}))
			)
			.onConflictDoNothing()
			.returning({
				pollId: responseSessions.pollId,
				userId: responseSessions.userId,
				anonymousIdentifier: responseSessions.anonymousIdentifier,
			});

		const acceptedKeys = new Set(
			insertedSessions.map((session) =>
				session.userId
					? `${session.pollId}:user:${session.userId}`
					: `${session.pollId}:anonymous:${session.anonymousIdentifier ?? ""}`
			)
		);

		const acceptedVotes = batch.filter((payload) => acceptedKeys.has(participantKey(payload)));

		if (acceptedVotes.length === 0) {
			return;
		}

		const createdResponses = await tx
			.insert(responses)
			.values(
				acceptedVotes.map((payload) => ({
					pollId: payload.pollId,
					userId: payload.isAnonymous ? null : payload.userId,
					anonymousUserIdentifier: payload.isAnonymous
						? (payload.anonymousIdentifier ?? payload.deviceFingerprint)
						: null,
					isAnonymous: payload.isAnonymous,
					ipAddress: payload.ipAddress,
					submittedAt: new Date(payload.submittedAt),
				}))
			)
			.returning({ id: responses.id });

		const answerRows = acceptedVotes.flatMap((payload, responseIndex) => {
			const response = createdResponses[responseIndex];

			if (!response) {
				return [];
			}

			return payload.answers.flatMap((answer) =>
				answer.optionIds.map((optionId) => ({
					responseId: response.id,
					questionId: answer.questionId,
					optionId,
				}))
			);
		});

		if (answerRows.length > 0) {
			await tx.insert(answers).values(answerRows).onConflictDoNothing();
		}
	});
}
