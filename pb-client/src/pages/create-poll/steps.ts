import type { CreatePollStep } from "./types";

export const createPollSteps: CreatePollStep[] = [
	{
		id: 1,
		label: "Poll Requirements",
		title: "Craft Your Inquiry",
		description:
			"Design a poll that invites thoughtful reflection and focused engagement.",
	},
	{
		id: 2,
		label: "Questions & Settings",
		title: "Shape the Response",
		description:
			"Add questions and configure how people will respond to this poll.",
	},
	{
		id: 3,
		label: "Review & Publish",
		title: "Final Review",
		description: "Check the poll details before publishing it to your audience.",
	},
];
