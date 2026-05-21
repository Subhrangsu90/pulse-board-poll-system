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

type PollResults = {
	poll: Pick<
		Poll,
		| "id"
		| "title"
		| "description"
		| "tags"
		| "responseMode"
		| "expiresAt"
		| "status"
		| "publicSlug"
		| "createdAt"
		| "updatedAt"
	>;
	summary: {
		totalResponses: number;
		totalAnswerSelections: number;
		anonymousResponses: number;
		authenticatedResponses: number;
		lastSubmittedAt: string | null;
		activeViewers?: number;
		regions?: Record<string, number>;
	};
	questions: Array<{
		id: string;
		questionText: string;
		questionType: "single_choice" | "multiple_choice" | null;
		isRequired: boolean | null;
		orderIndex: number;
		responseCount: number;
		totalSelections: number;
		options: Array<{
			id: string;
			optionText: string;
			orderIndex: number;
			selectionCount: number;
			percentage: number;
		}>;
	}>;
	recentResponses: Array<{
		id: string;
		submittedAt: string | null;
		isAnonymous: boolean;
		answerCount: number;
		status: "recorded" | "queued";
	}>;
};

type PublicPoll = {
	id: string;
	title: string;
	description: string | null;
	tags: string[];
	responseMode: "anonymous" | "authenticated";
	expiresAt: string;
	publicSlug: string | null;
	questions: Array<{
		id: string;
		questionText: string;
		questionType: "single_choice" | "multiple_choice" | null;
		isRequired: boolean | null;
		orderIndex: number;
		options: Array<{
			id: string;
			optionText: string;
			orderIndex: number;
		}>;
	}>;
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

type SubmitPollResponsePayload = {
	answers: Array<{
		questionId: string;
		optionIds: string[];
	}>;
};

type SubmittedPollResponse = {
	pollId: string;
	queued: true;
	isAnonymous: boolean;
	liveCounts: Record<string, number>;
	totalVotes: number;
};

type PublicPollLiveMetrics = {
	pollId: string;
	liveCounts: Record<string, number>;
	totalVotes: number;
	activeViewers: number;
	regions?: Record<string, number>;
};

type VoteQueueHealth = {
	queue: string;
	waiting: number;
	active: number;
	delayed: number;
	failed: number;
	completed: number;
	deadLetter: number;
};

type PollsSummary = {
	totalResponses: number;
	totalPolls: number;
	activePolls: number;
	draftPolls: number;
	completedPolls: number;
};

const pollsRoutes = {
	getPolls: "/poll/polls",
	pollsSummary: "/poll/polls/summary",
	queueHealth: "/poll/polls/realtime/queue-health",
	createPoll: "/poll/polls",
	poll: (pollId: string) => `/poll/polls/${pollId}`,
	publicPoll: (slug: string) => `/poll/public/poll/${slug}`,
	publicPollMetrics: (slug: string) => `/poll/public/poll/${slug}/metrics`,
	publicPollResults: (slug: string) => `/poll/public/poll/${slug}/results`,
	publicPollResponses: (slug: string) => `/poll/public/poll/${slug}/responses`,
	pollResults: (pollId: string) => `/poll/polls/${pollId}/results`,
	addQuestion: (pollId: string) => `/poll/polls/${pollId}/questions`,
	question: (questionId: string) => `/poll/questions/${questionId}`,
	publishPoll: (pollId: string) => `/poll/polls/${pollId}/publish`,
	completePoll: (pollId: string) => `/poll/polls/${pollId}/complete`,
} as const;

const pollService = {
	async getAllPolls() {
		return await apiGet<Poll[]>(pollsRoutes.getPolls);
	},

	async getPollsSummary() {
		return await apiGet<PollsSummary>(pollsRoutes.pollsSummary);
	},

	async getVoteQueueHealth() {
		return await apiGet<VoteQueueHealth>(pollsRoutes.queueHealth);
	},

	async getPollById(pollId: string) {
		return await apiGet<PollDetail>(pollsRoutes.poll(pollId));
	},

	async getPollResults(pollId: string) {
		return await apiGet<PollResults>(pollsRoutes.pollResults(pollId));
	},

	async getPublicPollBySlug(slug: string) {
		return await apiGet<PublicPoll>(pollsRoutes.publicPoll(slug));
	},

	async getPublicPollLiveMetrics(slug: string) {
		return await apiGet<PublicPollLiveMetrics>(pollsRoutes.publicPollMetrics(slug));
	},

	async getPublicPollResults(slug: string) {
		return await apiGet<PollResults>(pollsRoutes.publicPollResults(slug));
	},

	async submitPublicPollResponse(slug: string, payload: SubmitPollResponsePayload) {
		return await apiPost<SubmittedPollResponse>(pollsRoutes.publicPollResponses(slug), payload);
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
	PollsSummary,
	PollDetail,
	PollResults,
	PollQuestion,
	PublicPoll,
	PublicPollLiveMetrics,
	VoteQueueHealth,
	SubmittedPollResponse,
	SubmitPollResponsePayload,
	UpdatePollPayload,
};
