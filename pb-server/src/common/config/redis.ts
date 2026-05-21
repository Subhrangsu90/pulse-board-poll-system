import Redis from "ioredis";
import { env } from "../../config/env";
import { logger } from "../utils/logger";

export function createRedisConnection() {
	const connection = new Redis(env.redisUrl, {
		maxRetriesPerRequest: null,
		enableReadyCheck: false,
		retryStrategy(times) {
			return Math.min(times * 100, 3000);
		},
		reconnectOnError(error) {
			const message = error.message.toLowerCase();
			return message.includes("readonly") || message.includes("connection");
		},
	});

	connection.on("connect", () => logger.info("Redis connection established."));
	connection.on("error", (error) => logger.error(error));
	connection.on("reconnecting", () => logger.info("Redis reconnecting..."));

	return connection;
}

export const redis = createRedisConnection();
export const publisher = createRedisConnection();
export const subscriber = createRedisConnection();

export async function closeRedisConnections() {
	await Promise.allSettled([redis.quit(), publisher.quit(), subscriber.quit()]);
}
