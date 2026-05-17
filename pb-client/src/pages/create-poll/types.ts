export type ResponseMode = "anonymous" | "authenticated";
export type StepId = 1 | 2 | 3;

export type PollRequirements = {
	title: string;
	description: string;
	responseMode: ResponseMode;
	expiresDate: string;
	expiresTime: string;
};

export type CreatePollStep = {
	id: StepId;
	label: string;
	title: string;
	description: string;
};
