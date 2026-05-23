import { Queue, Worker } from "bullmq";
import { redis } from "../../../common/config/redis";
import { logger } from "../../../common/utils/logger";
import { expireDuePolls } from "../poll-lifecycle.service";

export const EXPIRY_QUEUE_NAME = "poll-expiry";

export const expiryQueue = new Queue(EXPIRY_QUEUE_NAME, {
	connection: redis,
});

let expiryWorker: Worker | null = null;

export async function startPollExpiryScheduler() {
	try {
		// Clean up any existing repeatable jobs to avoid duplicates on restart
		const repeatableJobs = await expiryQueue.getRepeatableJobs();
		for (const job of repeatableJobs) {
			await expiryQueue.removeRepeatableByKey(job.key);
		}

		await expiryQueue.add(
			"expire-polls-job",
			{},
			{
				repeat: {
					every: 30000, // every 30 seconds
				},
				jobId: "poll-expiry-job",
			}
		);

		expiryWorker = new Worker(
			EXPIRY_QUEUE_NAME,
			async () => {
				logger.info("Running scheduled expireDuePolls job...");
				const expiredPolls = await expireDuePolls();
				if (expiredPolls.length > 0) {
					logger.info(`Scheduled job: Expired ${expiredPolls.length} due polls.`);
				}
			},
			{
				connection: redis,
				concurrency: 1,
			}
		);

		expiryWorker.on("failed", (_job, error) => {
			logger.error(error);
		});

		expiryWorker.on("error", (error) => {
			logger.error(error);
		});

		logger.info("Poll expiry scheduler started.");
	} catch (error) {
		logger.error(error);
	}
}

export async function closePollExpiryScheduler() {
	if (expiryWorker) {
		await expiryWorker.close();
	}
	await expiryQueue.close();
}
