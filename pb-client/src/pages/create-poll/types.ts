export type ResponseMode = "anonymous" | "authenticated";
export type StepId = 1 | 2 | 3;

export type PollRequirements = {
	title: string;
	description: string;
	tags: string;
	publicSlug: string;
	responseMode: ResponseMode;
	expiresDate: string;
	expiresTime: string;
};

export type QuestionType = "single_choice" | "multiple_choice";

export type QuestionOptionText = {
	optionText: string;
};

export type SavedQuestionOption = QuestionOptionText & {
	id: string;
};

export type SavedQuestion = {
	id: string;
	questionText: string;
	questionType: QuestionType;
	isRequired: boolean;
	options: SavedQuestionOption[];
};

export type CreatePollStep = {
	id: StepId;
	label: string;
	title: string;
	description: string;
};
