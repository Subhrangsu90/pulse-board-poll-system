import type { SubmitPollResponseInput } from "../dto/responses.dto";

export type VoteSelection = {
	questionId: string;
	optionId: string;
};

export type VoteQueuePayload = {
	pollId: string;
	publicSlug: string;
	userId: string | null;
	anonymousIdentifier: string | null;
	isAnonymous: boolean;
	ipAddress: string | null;
	deviceFingerprint: string;
	answers: SubmitPollResponseInput["answers"];
	submittedAt: string;
};

export type VoteAcceptedResult = {
	pollId: string;
	queued: true;
	isAnonymous: boolean;
	liveCounts: Record<string, number>;
	totalVotes: number;
};
