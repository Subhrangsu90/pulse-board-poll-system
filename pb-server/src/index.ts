import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./app";
import { logger } from "./common/utils/logger";
import { env } from "./config/env";

function main() {
	try {
		const server = createServer(createApp());

		server.listen(env.port, () => {
			logger.info(`Server is running on http://localhost:${env.port}`);
		});
	} catch (error) {
		logger.error(error);
		process.exit(1);
	}
}

main();
