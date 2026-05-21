import { Queue, QueueEvents } from "bullmq";
import { redis } from "../../../common/config/redis";
import type { VoteQueuePayload } from "./vote.types";

export const VOTE_QUEUE_NAME = "poll-votes";
export const VOTE_DLQ_NAME = "poll-votes-dlq";

export const voteQueue = new Queue<VoteQueuePayload>(VOTE_QUEUE_NAME, {
	connection: redis,
	defaultJobOptions: {
		attempts: 5,
		backoff: {
			type: "exponential",
			delay: 1000,
		},
		removeOnComplete: {
			age: 60 * 60,
			count: 10000,
		},
		removeOnFail: false,
	},
});

export const voteDeadLetterQueue = new Queue<VoteQueuePayload>(VOTE_DLQ_NAME, {
	connection: redis,
	defaultJobOptions: {
		removeOnComplete: false,
		removeOnFail: false,
	},
});

export const voteQueueEvents = new QueueEvents(VOTE_QUEUE_NAME, { connection: redis });

export async function enqueueVote(payload: VoteQueuePayload) {
	return voteQueue.add("persist-vote", payload, {
		jobId: `${payload.pollId}:${payload.deviceFingerprint}`,
	});
}

export async function hasPendingVoteJob(pollId: string, deviceFingerprint: string) {
	const job = await voteQueue.getJob(`${pollId}:${deviceFingerprint}`);

	if (!job) {
		return false;
	}

	const state = await job.getState();

	return ["active", "delayed", "prioritized", "waiting", "waiting-children"].includes(state);
}

export async function getVoteQueueHealth() {
	const [waiting, active, delayed, failed, completed, deadLetter] = await Promise.all([
		voteQueue.getWaitingCount(),
		voteQueue.getActiveCount(),
		voteQueue.getDelayedCount(),
		voteQueue.getFailedCount(),
		voteQueue.getCompletedCount(),
		voteDeadLetterQueue.getWaitingCount(),
	]);

	return {
		queue: VOTE_QUEUE_NAME,
		waiting,
		active,
		delayed,
		failed,
		completed,
		deadLetter,
	};
}

export async function closeVoteQueues() {
	await Promise.allSettled([voteQueue.close(), voteDeadLetterQueue.close(), voteQueueEvents.close()]);
}
