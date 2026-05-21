import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "../api/apiService";

type PollVoteEvent = {
	pollId: string;
	optionId: string;
	count: number;
	totalVotes: number;
	submissionId?: string;
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

function getViewerRegion() {
	const locale = navigator.language || Intl.DateTimeFormat().resolvedOptions().locale || "Unknown";
	const region = locale.split("-")[1];
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	return region || timezone || "Unknown";
}

function getSocketUrl() {
	if (import.meta.env.VITE_SOCKET_URL) {
		return import.meta.env.VITE_SOCKET_URL;
	}

	if (API_BASE_URL.startsWith("http")) {
		return new URL(API_BASE_URL).origin;
	}

	return window.location.origin;
}

function createPollSocket() {
	return io(getSocketUrl(), {
		withCredentials: true,
		transports: ["websocket", "polling"],
		reconnection: true,
		reconnectionAttempts: Infinity,
		reconnectionDelay: 500,
		reconnectionDelayMax: 4000,
	});
}

function joinPollRoom(socket: Socket, pollId: string) {
	socket.emit("poll:join", {
		pollId,
		region: getViewerRegion(),
	});
}

function leavePollRoom(socket: Socket, pollId: string) {
	socket.emit("poll:leave", { pollId });
}

export { createPollSocket, joinPollRoom, leavePollRoom };
export type { PollAnalyticsEvent, PollVoteEvent };
