import type { Server as HttpServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import { Server } from "socket.io";
import { publisher, redis, subscriber } from "../config/redis";
import { logger } from "../utils/logger";
import { POLL_ANALYTICS_CHANNEL, POLL_VOTE_CHANNEL } from "./channels";

let io: Server | null = null;

type PollVoteEvent = {
	pollId: string;
	optionId: string;
	count: number;
	totalVotes: number;
	isAnonymous?: boolean;
	answerCount?: number;
	submittedAt?: string;
};

type PollAnalyticsEvent = {
	pollId: string;
	activeViewers?: number;
	totalVotes?: number;
	regions?: Record<string, number>;
};

function pollRoom(pollId: string) {
	return `poll:${pollId}`;
}

function viewerSetKey(pollId: string) {
	return `poll:${pollId}:viewerSockets`;
}

function viewerRegionKey(pollId: string) {
	return `poll:${pollId}:viewerRegions`;
}

async function publishViewerCount(pollId: string) {
	const activeSocketIds = io ? await io.in(pollRoom(pollId)).allSockets() : new Set<string>();
	const socketIds = Array.from(activeSocketIds);
	const regionValues =
		socketIds.length > 0 ? await redis.hmget(viewerRegionKey(pollId), ...socketIds) : [];
	const regions = regionValues.reduce<Record<string, number>>((counts, region) => {
		const normalizedRegion = normalizeRegion(region ?? undefined);
		counts[normalizedRegion] = (counts[normalizedRegion] ?? 0) + 1;
		return counts;
	}, {});

	await redis.del(viewerSetKey(pollId));

	if (socketIds.length > 0) {
		await redis.sadd(viewerSetKey(pollId), ...socketIds);
		await redis.expire(viewerSetKey(pollId), 120);
	}

	const payload: PollAnalyticsEvent = {
		pollId,
		activeViewers: socketIds.length,
		regions,
	};
	await publisher.publish(POLL_ANALYTICS_CHANNEL, JSON.stringify(payload));
}

function normalizeRegion(region?: string) {
	return (region || "Unknown").replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 64) || "Unknown";
}

export async function setupSocketServer(server: HttpServer) {
	io = new Server(server, {
		cors: {
			origin: true,
			credentials: true,
		},
		pingInterval: 25000,
		pingTimeout: 20000,
	});

	io.adapter(createAdapter(publisher, subscriber));

	io.on("connection", (socket) => {
		socket.data.pollRooms = new Set<string>();
		socket.data.viewerHeartbeat = setInterval(async () => {
			const pollRooms = socket.data.pollRooms as Set<string>;
			await Promise.all(
				Array.from(pollRooms).flatMap((pollId) => [
					redis.expire(viewerSetKey(pollId), 120),
					redis.expire(viewerRegionKey(pollId), 120),
				])
			);
		}, 30000);

		socket.on("poll:join", async ({ pollId, region }: { pollId?: string; region?: string }) => {
			if (!pollId) {
				return;
			}

			const room = pollRoom(pollId);
			const safeRegion = normalizeRegion(region);
			const pollRooms = socket.data.pollRooms as Set<string>;
			socket.join(room);
			pollRooms.add(pollId);
			socket.data.viewerRegions ??= new Map<string, string>();
			(socket.data.viewerRegions as Map<string, string>).set(pollId, safeRegion);
			await redis.hset(viewerRegionKey(pollId), socket.id, safeRegion);
			await redis.expire(viewerRegionKey(pollId), 120);
			await publishViewerCount(pollId);
		});

		socket.on("poll:leave", async ({ pollId }: { pollId?: string }) => {
			if (!pollId) {
				return;
			}

			socket.leave(pollRoom(pollId));
			const pollRooms = socket.data.pollRooms as Set<string>;
			pollRooms.delete(pollId);
			await redis.hdel(viewerRegionKey(pollId), socket.id);
			await redis.srem(viewerSetKey(pollId), socket.id);
			await publishViewerCount(pollId);
		});

		socket.on("disconnect", async () => {
			clearInterval(socket.data.viewerHeartbeat as NodeJS.Timeout);
			const pollRooms = socket.data.pollRooms as Set<string>;
			await Promise.all(
				Array.from(pollRooms).map(async (pollId) => {
					await redis.hdel(viewerRegionKey(pollId), socket.id);
					await redis.srem(viewerSetKey(pollId), socket.id);
					await publishViewerCount(pollId);
				})
			);
		});
	});

	const voteSubscriber = subscriber.duplicate();
	await voteSubscriber.subscribe(POLL_VOTE_CHANNEL, POLL_ANALYTICS_CHANNEL);

	voteSubscriber.on("message", (channel, rawMessage) => {
		try {
			if (channel === POLL_VOTE_CHANNEL) {
				const event = JSON.parse(rawMessage) as PollVoteEvent;
				io?.to(pollRoom(event.pollId)).emit("poll:vote", event);
				return;
			}

			if (channel === POLL_ANALYTICS_CHANNEL) {
				const event = JSON.parse(rawMessage) as PollAnalyticsEvent;
				io?.to(pollRoom(event.pollId)).emit("poll:analytics", event);
			}
		} catch (error) {
			logger.error(error);
		}
	});

	return io;
}

export async function closeSocketServer() {
	await new Promise<void>((resolve) => {
		if (!io) {
			resolve();
			return;
		}

		io.close(() => resolve());
	});
}
