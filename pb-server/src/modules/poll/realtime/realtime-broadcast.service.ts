import { publisher } from "../../../common/config/redis";
import { redis } from "../../../common/config/redis";
import { POLL_ANALYTICS_CHANNEL, POLL_VOTE_CHANNEL } from "../../../common/realtime/channels";

function viewerSetKey(pollId: string) {
	return `poll:${pollId}:viewerSockets`;
}

function viewerRegionKey(pollId: string) {
	return `poll:${pollId}:viewerRegions`;
}

export async function publishVoteEvents(
	pollId: string,
	liveCounts: Record<string, number>,
	totalVotes: number,
	metadata?: {
		submissionId: string;
		isAnonymous: boolean;
		answerCount: number;
		submittedAt: string;
	}
) {
	await Promise.all(
		Object.entries(liveCounts).map(([optionId, count]) =>
			publisher.publish(
				POLL_VOTE_CHANNEL,
				JSON.stringify({
					pollId,
					optionId,
					count,
					totalVotes,
					...metadata,
				})
			)
		)
	);
}

export async function publishPollAnalytics(pollId: string, analytics: Record<string, unknown>) {
	const [activeViewers, rawRegions] = await Promise.all([
		redis.scard(viewerSetKey(pollId)),
		redis.hgetall(viewerRegionKey(pollId)),
	]);

	const aggregatedRegions = Object.values(rawRegions as Record<string, string>).reduce<Record<string, number>>((acc, region) => {
		const safeRegion = region || "Unknown";
		acc[safeRegion] = (acc[safeRegion] || 0) + 1;
		return acc;
	}, {});

	await publisher.publish(
		POLL_ANALYTICS_CHANNEL,
		JSON.stringify({
			pollId,
			activeViewers,
			regions: aggregatedRegions,
			...analytics,
		})
	);
}
