import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./apiService";

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
	publicSlug?: string;
};

type UpdatePollPayload = Partial<CreatePollPayload>;

type QuestionOption = {
	id: string;
	questionId: string;
	optionText: string;
	orderIndex: number;
	createdAt: string | null;
	updatedAt: string | null;
};

type PollQuestion = {
	id: string;
	pollId: string;
	questionText: string;
	questionType: "single_choice" | "multiple_choice" | null;
	isRequired: boolean | null;
	orderIndex: number;
	createdAt: string | null;
	updatedAt: string | null;
	options: QuestionOption[];
};

type PollDetail = Poll & {
	questions: PollQuestion[];
};

type AddQuestionPayload = {
	questionText: string;
	questionType: "single_choice" | "multiple_choice";
	isRequired?: boolean;
	orderIndex?: number;
	options: Array<{
		optionText: string;
		orderIndex?: number;
	}>;
};

const pollsRoutes = {
	getPolls: "/poll/polls",
	createPoll: "/poll/polls",
	poll: (pollId: string) => `/poll/polls/${pollId}`,
	addQuestion: (pollId: string) => `/poll/polls/${pollId}/questions`,
	question: (questionId: string) => `/poll/questions/${questionId}`,
	publishPoll: (pollId: string) => `/poll/polls/${pollId}/publish`,
	completePoll: (pollId: string) => `/poll/polls/${pollId}/complete`,
} as const;

const pollService = {
	async getAllPolls() {
		return await apiGet<Poll[]>(pollsRoutes.getPolls);
	},

	async getPollById(pollId: string) {
		return await apiGet<PollDetail>(pollsRoutes.poll(pollId));
	},

	async createPoll(payload: CreatePollPayload) {
		return await apiPost<Poll>(pollsRoutes.createPoll, payload);
	},

	async updatePoll(pollId: string, payload: UpdatePollPayload) {
		return await apiPatch<Poll>(pollsRoutes.poll(pollId), payload);
	},

	async deletePoll(pollId: string) {
		return await apiDelete<Poll>(pollsRoutes.poll(pollId));
	},

	async addQuestionToPoll(pollId: string, payload: AddQuestionPayload) {
		return await apiPost<PollQuestion>(pollsRoutes.addQuestion(pollId), payload);
	},

	async updateQuestion(questionId: string, payload: AddQuestionPayload) {
		return await apiPut<PollQuestion>(pollsRoutes.question(questionId), payload);
	},

	async deleteQuestion(questionId: string) {
		return await apiDelete<PollQuestion>(pollsRoutes.question(questionId));
	},

	async publishPoll(pollId: string) {
		return await apiPost<Poll>(pollsRoutes.publishPoll(pollId));
	},

	async completePoll(pollId: string) {
		return await apiPatch<Poll>(pollsRoutes.completePoll(pollId));
	},
};

export { pollService };
export type {
	AddQuestionPayload,
	CreatePollPayload,
	Poll,
	PollDetail,
	PollQuestion,
	UpdatePollPayload,
};
