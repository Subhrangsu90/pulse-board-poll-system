import { redis } from "../../../common/config/redis";

function optionCounterKey(pollId: string, optionId: string) {
	return `poll:${pollId}:option:${optionId}`;
}

function totalCounterKey(pollId: string) {
	return `poll:${pollId}:votes:total`;
}

function viewerSetKey(pollId: string) {
	return `poll:${pollId}:viewerSockets`;
}

function viewerRegionKey(pollId: string) {
	return `poll:${pollId}:viewerRegions`;
}

export async function incrementVoteCounters(
	pollId: string,
	optionIds: string[],
	expiresAt?: Date
) {
	const pipeline = redis.pipeline();

	for (const optionId of optionIds) {
		pipeline.incr(optionCounterKey(pollId, optionId));
	}

	pipeline.incrby(totalCounterKey(pollId), 1);

	if (expiresAt) {
		const ttlSeconds = Math.max(Math.ceil((expiresAt.getTime() - Date.now()) / 1000), 60);
		for (const optionId of optionIds) {
			pipeline.expire(optionCounterKey(pollId, optionId), ttlSeconds);
		}
		pipeline.expire(totalCounterKey(pollId), ttlSeconds);
	}

	const results = await pipeline.exec();
	const liveCounts: Record<string, number> = {};

	optionIds.forEach((optionId, index) => {
		const result = results?.[index]?.[1];
		liveCounts[optionId] = typeof result === "number" ? result : Number(result ?? 0);
	});

	const totalResult = results?.[optionIds.length]?.[1];

	return {
		liveCounts,
		totalVotes: typeof totalResult === "number" ? totalResult : Number(totalResult ?? 0),
	};
}

export async function rollbackVoteCounters(pollId: string, optionIds: string[]) {
	const pipeline = redis.pipeline();

	for (const optionId of optionIds) {
		pipeline.decr(optionCounterKey(pollId, optionId));
	}

	pipeline.decr(totalCounterKey(pollId));

	await pipeline.exec();
}

export async function getPollLiveMetrics(pollId: string, optionIds: string[]) {
	const pipeline = redis.pipeline();

	for (const optionId of optionIds) {
		pipeline.get(optionCounterKey(pollId, optionId));
	}

	pipeline.get(totalCounterKey(pollId));
	pipeline.scard(viewerSetKey(pollId));
	pipeline.hgetall(viewerRegionKey(pollId));

	const results = await pipeline.exec();
	const liveCounts: Record<string, number> = {};

	optionIds.forEach((optionId, index) => {
		liveCounts[optionId] = Number(results?.[index]?.[1] ?? 0);
	});

	const rawRegions = (results?.[optionIds.length + 2]?.[1] as Record<string, string>) ?? {};
	const aggregatedRegions = Object.values(rawRegions).reduce<Record<string, number>>((acc, region) => {
		const safeRegion = region || "Unknown";
		acc[safeRegion] = (acc[safeRegion] || 0) + 1;
		return acc;
	}, {});

	return {
		pollId,
		liveCounts,
		totalVotes: Number(results?.[optionIds.length]?.[1] ?? 0),
		activeViewers: Number(results?.[optionIds.length + 1]?.[1] ?? 0),
		regions: aggregatedRegions,
	};
}
