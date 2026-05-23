import { create } from "zustand";
import type { CurrentUser } from "../services/api/authService";
import type { PollRequirements, SavedQuestion, StepId } from "../pages/create-poll/types";
import { getWorkspacePreferences } from "../utils/workspacePreferences";

function getDefaultDateTime() {
	const date = new Date();
	date.setDate(date.getDate() + 7);

	return {
		date: date.toISOString().slice(0, 10),
		time: date.toTimeString().slice(0, 5),
	};
}

const defaultDateTime = getDefaultDateTime();

function getInitialPollId() {
	if (typeof window !== "undefined") {
		return new URLSearchParams(window.location.search).get("pollId");
	}
	return null;
}

export const getInitialRequirements = (): PollRequirements => ({
	title: "",
	description: "",
	tags: "",
	publicSlug: "",
	responseMode: getWorkspacePreferences().defaultResponseMode,
	expiresDate: defaultDateTime.date,
	expiresTime: defaultDateTime.time,
});

interface AppState {
	// Session User
	currentUser: CurrentUser | null;
	setCurrentUser: (user: CurrentUser | null | ((prev: CurrentUser | null) => CurrentUser | null)) => void;

	// Results/Analytics selection
	selectedPollId: string | null;
	setSelectedPollId: (id: string | null | ((prev: string | null) => string | null)) => void;

	// Poll Creation Wizard State
	pollCreation: {
		requirements: PollRequirements;
		questions: SavedQuestion[];
		currentStep: StepId;
		createdPollId: string | null;
		createdPollSlug: string | null;
	};
	setPollCreationRequirements: (requirements: Partial<PollRequirements> | ((prev: PollRequirements) => Partial<PollRequirements>)) => void;
	setPollCreationQuestions: (questions: SavedQuestion[] | ((prev: SavedQuestion[]) => SavedQuestion[])) => void;
	setPollCreationStep: (step: StepId | ((prev: StepId) => StepId)) => void;
	setCreatedPollId: (id: string | null | ((prev: string | null) => string | null)) => void;
	setCreatedPollSlug: (slug: string | null | ((prev: string | null) => string | null)) => void;
	resetPollCreation: () => void;
}

export const useAppStore = create<AppState>((set) => ({
	// Session User
	currentUser: null,
	setCurrentUser: (user) =>
		set((state) => ({
			currentUser: typeof user === "function" ? user(state.currentUser) : user,
		})),

	// Results/Analytics selection
	selectedPollId: getInitialPollId(),
	setSelectedPollId: (id) =>
		set((state) => ({
			selectedPollId: typeof id === "function" ? id(state.selectedPollId) : id,
		})),

	// Poll Creation Wizard State
	pollCreation: {
		requirements: getInitialRequirements(),
		questions: [],
		currentStep: 1,
		createdPollId: null,
		createdPollSlug: null,
	},
	setPollCreationRequirements: (requirements) =>
		set((state) => {
			const nextReqs =
				typeof requirements === "function"
					? requirements(state.pollCreation.requirements)
					: requirements;
			return {
				pollCreation: {
					...state.pollCreation,
					requirements: {
						...state.pollCreation.requirements,
						...nextReqs,
					},
				},
			};
		}),
	setPollCreationQuestions: (questions) =>
		set((state) => ({
			pollCreation: {
				...state.pollCreation,
				questions:
					typeof questions === "function"
						? questions(state.pollCreation.questions)
						: questions,
			},
		})),
	setPollCreationStep: (step) =>
		set((state) => ({
			pollCreation: {
				...state.pollCreation,
				currentStep:
					typeof step === "function"
						? step(state.pollCreation.currentStep)
						: step,
			},
		})),
	setCreatedPollId: (id) =>
		set((state) => ({
			pollCreation: {
				...state.pollCreation,
				createdPollId:
					typeof id === "function"
						? id(state.pollCreation.createdPollId)
						: id,
			},
		})),
	setCreatedPollSlug: (slug) =>
		set((state) => ({
			pollCreation: {
				...state.pollCreation,
				createdPollSlug:
					typeof slug === "function"
						? slug(state.pollCreation.createdPollSlug)
						: slug,
			},
		})),
	resetPollCreation: () =>
		set({
			pollCreation: {
				requirements: getInitialRequirements(),
				questions: [],
				currentStep: 1,
				createdPollId: null,
				createdPollSlug: null,
			},
		}),
}));
