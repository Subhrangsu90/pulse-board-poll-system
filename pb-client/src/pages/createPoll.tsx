import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useMemo, useState } from "react";
import { pollService } from "../services/api/pollService";
import { CreatePollStepper } from "./create-poll/CreatePollStepper";
import { PollRequirementsStep } from "./create-poll/PollRequirementsStep";
import { QuestionsConfigurationStep } from "./create-poll/QuestionsConfigurationStep";
import { ReviewPublishStep } from "./create-poll/ReviewPublishStep";
import { createPollSteps } from "./create-poll/steps";
import type { PollRequirements, StepId } from "./create-poll/types";

function getDefaultDateTime() {
	const date = new Date();
	date.setDate(date.getDate() + 7);

	return {
		date: date.toISOString().slice(0, 10),
		time: date.toTimeString().slice(0, 5),
	};
}

const defaultDateTime = getDefaultDateTime();

export default function CreatePoll() {
	const navigate = useNavigate();
	const [currentStep, setCurrentStep] = useState<StepId>(1);
	const [createdPollId, setCreatedPollId] = useState<string | null>(null);
	const [requirements, setRequirements] = useState<PollRequirements>({
		title: "",
		description: "",
		responseMode: "anonymous",
		expiresDate: defaultDateTime.date,
		expiresTime: defaultDateTime.time,
	});
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const activeStep =
		createPollSteps.find((step) => step.id === currentStep) ??
		createPollSteps[0];

	const expiresAt = useMemo(() => {
		if (!requirements.expiresDate || !requirements.expiresTime) return null;
		return new Date(`${requirements.expiresDate}T${requirements.expiresTime}`);
	}, [requirements.expiresDate, requirements.expiresTime]);

	const updateRequirements = (nextRequirements: Partial<PollRequirements>) => {
		setRequirements((currentRequirements) => ({
			...currentRequirements,
			...nextRequirements,
		}));
	};

	const validateRequirements = () => {
		setError(null);

		if (!requirements.title.trim()) {
			setError("Title is required.");
			return false;
		}

		if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
			setError("Choose a valid expiry date and time.");
			return false;
		}

		if (expiresAt <= new Date()) {
			setError("Expiry must be in the future.");
			return false;
		}

		return true;
	};

	const createDraftPoll = async () => {
		if (createdPollId) return createdPollId;
		if (!validateRequirements() || !expiresAt) return null;

		setIsSubmitting(true);

		try {
			const poll = await pollService.createPoll({
				title: requirements.title.trim(),
				description: requirements.description.trim() || undefined,
				responseMode: requirements.responseMode,
				expiresAt: expiresAt.toISOString(),
				isPublished: false,
			});

			setCreatedPollId(poll.id);
			return poll.id;
		} catch (submitError) {
			console.error("Unable to create draft poll:", submitError);
			setError("Unable to save poll requirements. Please try again.");
			return null;
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleContinue = async () => {
		if (currentStep === 1) {
			const pollId = await createDraftPoll();
			if (pollId) setCurrentStep(2);
			return;
		}

		if (currentStep === 2) {
			setCurrentStep(3);
		}
	};

	const handleSaveDraft = async () => {
		const pollId = await createDraftPoll();
		if (pollId) {
			await navigate({ to: "/drafts" });
		}
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		await handleContinue();
	};

	return (
		<div className="flex-1 space-y-gutter pb-32 md:pb-0">
			<header className="mb-xl">
				<div className="mb-sm flex items-center gap-2">
					<CreatePollStepper currentStep={currentStep} />
					<span className="font-sans text-label-md uppercase tracking-wider text-primary">
						Step {currentStep} of {createPollSteps.length}: {activeStep.label}
					</span>
				</div>
				<h2 className="font-serif text-display-lg text-on-surface mb-xs">
					{activeStep.title}
				</h2>
				<p className="font-sans text-body-lg text-on-surface-variant">
					{activeStep.description}
				</p>
			</header>

			<form className="space-y-lg" onSubmit={handleSubmit}>
				{currentStep === 1 ? (
					<PollRequirementsStep
						onChange={updateRequirements}
						requirements={requirements}
					/>
				) : null}

				{currentStep === 2 ? (
					<QuestionsConfigurationStep pollId={createdPollId} />
				) : null}

				{currentStep === 3 ? <ReviewPublishStep pollId={createdPollId} /> : null}

				{error ? (
					<p className="rounded-md bg-error-container px-md py-sm font-sans text-body-md text-on-error-container">
						{error}
					</p>
				) : null}

				<div className="flex flex-col items-center gap-md pt-xl md:flex-row">
					{currentStep > 1 ? (
						<button
							className="w-full rounded-full bg-surface-container-low px-10 py-4 font-sans text-label-lg font-bold text-primary transition-all hover:bg-surface-container-high md:w-auto"
							onClick={() =>
								setCurrentStep((currentStep - 1) as StepId)
							}
							type="button">
							Back
						</button>
					) : null}

					{currentStep < 3 ? (
						<button
							className="w-full rounded-full bg-primary-container px-10 py-4 font-sans text-label-lg font-bold text-on-primary-container transition-all hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
							disabled={isSubmitting}
							type="submit">
							{isSubmitting ? "Saving..." : "Continue"}
						</button>
					) : (
						<button
							className="w-full rounded-full bg-primary-container px-10 py-4 font-sans text-label-lg font-bold text-on-primary-container transition-all hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
							disabled
							type="button">
							Publish Poll
						</button>
					)}

					<button
						className="w-full rounded-full bg-surface-container-low px-10 py-4 font-sans text-label-lg font-bold text-primary transition-all hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
						disabled={isSubmitting}
						onClick={() => void handleSaveDraft()}
						type="button">
						{isSubmitting ? "Saving..." : "Save as Draft"}
					</button>
				</div>
			</form>
		</div>
	);
}
