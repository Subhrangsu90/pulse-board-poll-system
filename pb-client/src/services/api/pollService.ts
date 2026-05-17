import { apiGet } from "./apiService";

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

const pollsRoutes = {
	getPolls: "/poll/polls",
} as const;

const pollService = {
	async getAllPolls() {
		return await apiGet<Poll[]>(pollsRoutes.getPolls);
	},
};

export { pollService };
export type { Poll };
