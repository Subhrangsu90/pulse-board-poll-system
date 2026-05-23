import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./app";
import { closeRedisConnections } from "./common/config/redis";
import { closeSocketServer, setupSocketServer } from "./common/realtime/socket";
import { logger } from "./common/utils/logger";
import { env } from "./config/env";
import { closeVoteQueues } from "./modules/poll/realtime/vote.queue";
import { createVoteWorker, closeVoteWorker } from "./modules/poll/realtime/vote.worker";

async function main() {
	try {
		const server = createServer(createApp());
		await setupSocketServer(server);

		const worker = createVoteWorker();
		logger.info("Vote worker is running.");

		server.listen(env.port, () => {
			logger.info(`Server is running on http://localhost:${env.port}`);
		});

		async function shutdown(signal: string) {
			logger.info(`Received ${signal}. Closing server...`);
			server.close(async () => {
				await closeSocketServer();
				await closeVoteWorker(worker);
				await closeVoteQueues();
				await closeRedisConnections();
				process.exit(0);
			});
		}

		process.on("SIGTERM", () => void shutdown("SIGTERM"));
		process.on("SIGINT", () => void shutdown("SIGINT"));
	} catch (error) {
		logger.error(error);
		process.exit(1);
	}
}

main();
