import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../components/toastContext";
import { getApiErrorMessage } from "../services/api/apiService";
import {
	pollService,
	type AddQuestionPayload,
	type PollDetail,
} from "../services/api/pollService";
import { Skeleton } from "../components/Skeleton";
import { useAppStore } from "../store/useAppStore";
import { CreatePollStepper } from "./create-poll/CreatePollStepper";
import { PollRequirementsStep } from "./create-poll/PollRequirementsStep";
import { QuestionsConfigurationStep } from "./create-poll/QuestionsConfigurationStep";
import { ReviewPublishStep } from "./create-poll/ReviewPublishStep";
import { createPollSteps } from "./create-poll/steps";
import type {
	PollRequirements,
	StepId,
} from "./create-poll/types";

function getEditPollIdFromPath() {
	const match = window.location.pathname.match(/\/polls\/([^/]+)\/edit$/);
	return match?.[1] ?? null;
}

function toLocalDateInputValue(value: string) {
	const date = new Date(value);
	date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
	return {
		date: date.toISOString().slice(0, 10),
		time: date.toISOString().slice(11, 16),
	};
}

export default function CreatePoll() {
	const navigate = useNavigate();
	const toast = useToast();
	const editPollId = getEditPollIdFromPath();
	const isEditMode = Boolean(editPollId);

	const wizard = useAppStore((state) => state.pollCreation);
	const setRequirements = useAppStore((state) => state.setPollCreationRequirements);
	const setQuestions = useAppStore((state) => state.setPollCreationQuestions);
	const setCurrentStep = useAppStore((state) => state.setPollCreationStep);
	const setCreatedPollId = useAppStore((state) => state.setCreatedPollId);
	const setCreatedPollSlug = useAppStore((state) => state.setCreatedPollSlug);
	const resetPollCreation = useAppStore((state) => state.resetPollCreation);

	const { requirements, questions, currentStep, createdPollId, createdPollSlug } = wizard;

	const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoadingEditPoll, setIsLoadingEditPoll] = useState(isEditMode);

	const activeStep =
		createPollSteps.find((step) => step.id === currentStep) ??
		createPollSteps[0];

	const expiresAt = useMemo(() => {
		if (!requirements.expiresDate || !requirements.expiresTime) return null;
		return new Date(
			`${requirements.expiresDate}T${requirements.expiresTime}`,
		);
	}, [requirements.expiresDate, requirements.expiresTime]);

	const updateRequirements = (
		nextRequirements: Partial<PollRequirements>,
	) => {
		setRequirements(nextRequirements);
	};

	const showError = useCallback(
		(message: string) => {
			setError(message);
			toast.error(message);
		},
		[toast],
	);

	const validateRequirements = () => {
		setError(null);

		if (!requirements.title.trim()) {
			showError("Title is required.");
			return false;
		}

		if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
			showError("Choose a valid expiry date and time.");
			return false;
		}

		if (expiresAt <= new Date()) {
			showError("Expiry must be in the future.");
			return false;
		}

		return true;
	};

	const hydrateEditPoll = (poll: PollDetail) => {
		const expiresAt = toLocalDateInputValue(poll.expiresAt);

		setCreatedPollId(poll.id);
		setCreatedPollSlug(poll.publicSlug);
		setRequirements({
			title: poll.title,
			description: poll.description ?? "",
			tags: poll.tags.join(", "),
			publicSlug: poll.publicSlug ?? "",
			responseMode: poll.responseMode,
			expiresDate: expiresAt.date,
			expiresTime: expiresAt.time,
		});
		setQuestions(
			poll.questions.map((question) => ({
				id: question.id,
				questionText: question.questionText,
				questionType: question.questionType ?? "single_choice",
				isRequired: question.isRequired ?? true,
				options: question.options.map((option) => ({
					id: option.id,
					optionText: option.optionText,
				})),
			})),
		);
	};

	useEffect(() => {
		if (!editPollId) return;

		void (async () => {
			try {
				hydrateEditPoll(await pollService.getPollById(editPollId));
			} catch (loadError) {
				console.error("Unable to load poll for editing:", loadError);
				showError(
					getApiErrorMessage(
						loadError,
						"Unable to load poll for editing.",
					),
				);
			} finally {
				setIsLoadingEditPoll(false);
			}
		})();
	}, [editPollId, showError]);

	const createDraftPoll = async () => {
		if (createdPollId) return createdPollId;
		if (!validateRequirements() || !expiresAt) return null;

		setIsSubmitting(true);

		try {
			const poll = await pollService.createPoll({
				title: requirements.title.trim(),
				description: requirements.description.trim() || undefined,
				tags: requirements.tags
					.split(",")
					.map((tag) => tag.trim())
					.filter(Boolean),
				publicSlug: requirements.publicSlug.trim() || undefined,
				responseMode: requirements.responseMode,
				expiresAt: expiresAt.toISOString(),
			});

			setCreatedPollId(poll.id);
			setCreatedPollSlug(poll.publicSlug);
			return poll.id;
		} catch (submitError) {
			console.error("Unable to create draft poll:", submitError);
			showError(
				getApiErrorMessage(
					submitError,
					"Unable to save poll requirements. Please try again.",
				),
			);
			return null;
		} finally {
			setIsSubmitting(false);
		}
	};

	const savePollRequirements = async () => {
		if (!validateRequirements() || !expiresAt) return null;

		if (!createdPollId) {
			return createDraftPoll();
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const poll = await pollService.updatePoll(createdPollId, {
				title: requirements.title.trim(),
				description: requirements.description.trim() || undefined,
				tags: requirements.tags
					.split(",")
					.map((tag) => tag.trim())
					.filter(Boolean),
				publicSlug: requirements.publicSlug.trim() || undefined,
				responseMode: requirements.responseMode,
				expiresAt: expiresAt.toISOString(),
			});

			setCreatedPollSlug(poll.publicSlug);
			return poll.id;
		} catch (submitError) {
			console.error("Unable to save poll requirements:", submitError);
			showError(
				getApiErrorMessage(
					submitError,
					"Unable to save poll requirements. Please try again.",
				),
			);
			return null;
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleContinue = async () => {
		if (currentStep === 1) {
			const pollId = await savePollRequirements();
			if (pollId) setCurrentStep(2);
			return;
		}

		if (currentStep === 2) {
			if (questions.length === 0) {
				showError("Add at least one question before review.");
				return;
			}

			setError(null);
			setCurrentStep(3);
		}
	};

	const handleUpdateQuestion = async (
		questionId: string,
		question: AddQuestionPayload,
	) => {
		setIsSubmitting(true);
		setError(null);

		try {
			const savedQuestion = await pollService.updateQuestion(questionId, {
				...question,
				options: question.options.map((option, optionIndex) => ({
					...option,
					orderIndex: optionIndex,
				})),
			});

			setQuestions((currentQuestions) =>
				currentQuestions.map((currentQuestion) =>
					currentQuestion.id === questionId
						? {
								id: savedQuestion.id,
								questionText: savedQuestion.questionText,
								questionType:
									savedQuestion.questionType ??
									"single_choice",
								isRequired: savedQuestion.isRequired ?? true,
								options: savedQuestion.options.map(
									(option) => ({
										id: option.id,
										optionText: option.optionText,
									}),
								),
							}
						: currentQuestion,
				),
			);

			return true;
		} catch (submitError) {
			console.error("Unable to update question:", submitError);
			showError(
				getApiErrorMessage(
					submitError,
					"Unable to update question. Please try again.",
				),
			);
			return false;
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeleteQuestion = async (questionId: string) => {
		if (!window.confirm("Delete this question?")) return;

		setIsSubmitting(true);
		setError(null);

		try {
			await pollService.deleteQuestion(questionId);
			setQuestions((currentQuestions) =>
				currentQuestions.filter(
					(question) => question.id !== questionId,
				),
			);
		} catch (submitError) {
			console.error("Unable to delete question:", submitError);
			showError(
				getApiErrorMessage(
					submitError,
					"Unable to delete question. Please try again.",
				),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleAddQuestion = async (question: AddQuestionPayload) => {
		const pollId = await createDraftPoll();
		if (!pollId) return false;

		setIsSubmitting(true);
		setError(null);

		try {
			const savedQuestion = await pollService.addQuestionToPoll(pollId, {
				...question,
				orderIndex: questions.length,
				options: question.options.map((option, optionIndex) => ({
					...option,
					orderIndex: optionIndex,
				})),
			});

			setQuestions((currentQuestions) => [
				...currentQuestions,
				{
					id: savedQuestion.id,
					questionText: savedQuestion.questionText,
					questionType: savedQuestion.questionType ?? "single_choice",
					isRequired: savedQuestion.isRequired ?? true,
					options: savedQuestion.options.map((option) => ({
						id: option.id,
						optionText: option.optionText,
					})),
				},
			]);

			return true;
		} catch (submitError) {
			console.error("Unable to save question:", submitError);
			showError(
				getApiErrorMessage(
					submitError,
					"Unable to save question. Please try again.",
				),
			);
			return false;
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePublishPoll = async () => {
		if (!createdPollId) {
			showError("Create the draft poll before publishing.");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const publishedPoll = await pollService.publishPoll(createdPollId);
			setCreatedPollSlug(publishedPoll.publicSlug);
			setIsPublishDialogOpen(true);
		} catch (submitError) {
			console.error("Unable to publish poll:", submitError);
			showError(
				getApiErrorMessage(
					submitError,
					"Unable to publish poll. Check questions and options, then try again.",
				),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSaveDraft = async () => {
		const pollId = isEditMode
			? await savePollRequirements()
			: await createDraftPoll();
		if (pollId) {
			resetPollCreation();
			await navigate({ to: "/drafts" });
		}
	};

	return (
		<div className="flex-1 space-y-gutter pb-32 md:pb-0">
			<header className="mb-xl">
				<div className="mb-sm flex items-center gap-2">
					<CreatePollStepper currentStep={currentStep} />
					<span className="font-sans text-label-md uppercase tracking-wider text-primary">
						Step {currentStep} of {createPollSteps.length}:{" "}
						{activeStep.label}
					</span>
				</div>
				<h2 className="font-serif text-display-lg text-on-surface mb-xs">
					{isEditMode
						? `Edit poll: ${activeStep.title}`
						: activeStep.title}
				</h2>
				<p className="font-sans text-body-lg text-on-surface-variant">
					{activeStep.description}
				</p>
			</header>

			{isLoadingEditPoll ? (
				<div className="space-y-lg rounded-xl border border-outline-variant bg-surface-container p-xl">
					<div className="space-y-sm">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-10 w-full" />
					</div>
					<div className="space-y-sm">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-24 w-full" />
					</div>
					<div className="grid grid-cols-1 gap-md md:grid-cols-2">
						<div className="space-y-sm">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div className="space-y-sm">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-10 w-full" />
						</div>
					</div>
				</div>
			) : (
				<div className="space-y-lg">
					{currentStep === 1 ? (
						<PollRequirementsStep
							onChange={updateRequirements}
							requirements={requirements}
						/>
					) : null}

					{currentStep === 2 ? (
						<QuestionsConfigurationStep
							isSubmitting={isSubmitting}
							onAddQuestion={handleAddQuestion}
							onDeleteQuestion={handleDeleteQuestion}
							onUpdateQuestion={handleUpdateQuestion}
							pollId={createdPollId}
							questions={questions}
						/>
					) : null}

					{currentStep === 3 ? (
						<ReviewPublishStep
							isPublishDialogOpen={isPublishDialogOpen}
							onClosePublishDialog={() =>
								setIsPublishDialogOpen(false)
							}
							onFinishPublish={() => {
								resetPollCreation();
								void navigate({ to: "/polls" });
							}}
							pollId={createdPollId}
							publicSlug={createdPollSlug}
							questions={questions}
							requirements={requirements}
						/>
					) : null}

					{error ? (
						<p className="rounded-md bg-error-container px-md py-sm font-sans text-body-md text-on-error-container">
							{error}
						</p>
					) : null}

					<div className="flex flex-col items-center gap-md pt-xl md:flex-row">
						{currentStep > 1 ? (
							<button
								className="w-full rounded-full bg-surface-container-low px-10 py-4 font-sans text-label-lg font-bold text-primary transition-all hover:bg-surface-container-high md:w-auto"
								onClick={() => {
									setIsPublishDialogOpen(false);
									setCurrentStep((currentStep - 1) as StepId);
								}}
								type="button">
								Back
							</button>
						) : null}

						{currentStep < 3 ? (
							<button
								className="w-full rounded-full bg-primary-container px-10 py-4 font-sans text-label-lg font-bold text-on-primary-container transition-all hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
								disabled={isSubmitting}
								onClick={() => void handleContinue()}
								type="button">
								{isSubmitting ? "Saving..." : "Continue"}
							</button>
						) : (
							<button
								className="w-full rounded-full bg-primary-container px-10 py-4 font-sans text-label-lg font-bold text-on-primary-container transition-all hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
								disabled={isSubmitting}
								onClick={() => void handlePublishPoll()}
								type="button">
								{isSubmitting
									? "Publishing..."
									: "Publish Poll"}
							</button>
						)}

						<button
							className="w-full rounded-full bg-surface-container-low px-10 py-4 font-sans text-label-lg font-bold text-primary transition-all hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
							disabled={isSubmitting}
							onClick={() => void handleSaveDraft()}
							type="button">
							{isSubmitting
								? "Saving..."
								: isEditMode
									? "Save Changes"
									: "Save as Draft"}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
