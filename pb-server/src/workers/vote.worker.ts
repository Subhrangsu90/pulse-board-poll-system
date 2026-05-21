import "dotenv/config";
import { closeRedisConnections } from "../common/config/redis";
import { logger } from "../common/utils/logger";
import { createVoteWorker, closeVoteWorker } from "../modules/poll/realtime/vote.worker";
import { closeVoteQueues } from "../modules/poll/realtime/vote.queue";

const worker = createVoteWorker();

async function shutdown(signal: string) {
	logger.info(`Received ${signal}. Closing vote worker...`);
	await closeVoteWorker(worker);
	await closeVoteQueues();
	await closeRedisConnections();
	process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

logger.info("Vote worker is running.");
