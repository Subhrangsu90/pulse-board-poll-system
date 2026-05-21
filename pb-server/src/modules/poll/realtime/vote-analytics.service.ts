import { redis } from "../../../common/config/redis";

export async function recordVoteAnalytics(pollId: string, selectedOptionIds: string[]) {
	const minuteBucket = Math.floor(Date.now() / 60000);
	const analyticsKey = `poll:${pollId}:analytics:${minuteBucket}`;
	const pipeline = redis.pipeline();

	pipeline.hincrby(analyticsKey, "votes", 1);

	for (const optionId of selectedOptionIds) {
		pipeline.hincrby(analyticsKey, `option:${optionId}`, 1);
	}

	pipeline.expire(analyticsKey, 60 * 60 * 24);

	await pipeline.exec();
}
