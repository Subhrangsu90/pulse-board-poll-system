import { Job, Worker } from "bullmq";
import { redis } from "../../../common/config/redis";
import { logger } from "../../../common/utils/logger";
import { env } from "../../../config/env";
import { BatchVotePersistenceService } from "./batch-vote-persistence.service";
import {
	VOTE_QUEUE_NAME,
	voteDeadLetterQueue,
	voteQueueEvents,
} from "./vote.queue";
import type { VoteQueuePayload } from "./vote.types";

const batchPersistence = new BatchVotePersistenceService();

export function createVoteWorker() {
	const worker = new Worker<VoteQueuePayload>(
		VOTE_QUEUE_NAME,
		async (job: Job<VoteQueuePayload>) => {
			await batchPersistence.add(job.data);
		},
		{
			connection: redis,
			concurrency: env.voteQueueConcurrency,
			lockDuration: 30000,
			stalledInterval: 30000,
			maxStalledCount: 2,
		}
	);

	worker.on("failed", async (job, error) => {
		logger.error(error);

		if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) {
			return;
		}

		await voteDeadLetterQueue.add("dead-letter-vote", job.data, {
			jobId: `dlq:${job.id}`,
		});
	});

	worker.on("error", (error) => logger.error(error));
	voteQueueEvents.on("stalled", ({ jobId }) => logger.error(`Vote job stalled: ${jobId}`));

	return worker;
}

export async function closeVoteWorker(worker: Worker<VoteQueuePayload>) {
	await batchPersistence.shutdown();
	await worker.close();
}
