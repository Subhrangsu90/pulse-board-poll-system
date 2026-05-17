import { apiGet, apiPost } from "./apiService";

type Poll = {
	id: string;
	creatorId: string;
	title: string;
	description: string | null;
	tags: string[];
	responseMode: "anonymous" | "authenticated";
	expiresAt: string;
	isPublished: boolean | null;
	status: "draft" | "active" | "expired" | "completed" | null;
	publicSlug: string | null;
	createdAt: string | null;
	updatedAt: string | null;
};

type CreatePollPayload = {
	title: string;
	description?: string;
	tags?: string[];
	responseMode: "anonymous" | "authenticated";
	expiresAt: string;
	isPublished?: boolean;
	publicSlug?: string;
};

const pollsRoutes = {
	getPolls: "/poll/polls",
	createPoll: "/poll/polls",
} as const;

const pollService = {
	async getAllPolls() {
		return await apiGet<Poll[]>(pollsRoutes.getPolls);
	},

	async createPoll(payload: CreatePollPayload) {
		return await apiPost<Poll>(pollsRoutes.createPoll, payload);
	},
};

export { pollService };
export type { CreatePollPayload, Poll };
