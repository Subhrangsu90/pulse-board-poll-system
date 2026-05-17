import { createPollSteps } from "./steps";
import type { StepId } from "./types";

type CreatePollStepperProps = {
	currentStep: StepId;
};

export function CreatePollStepper({ currentStep }: CreatePollStepperProps) {
	return (
		<div className="flex gap-1">
			{createPollSteps.map((step) => (
				<div
					aria-label={step.label}
					className={`h-1.5 w-8 rounded-full transition-colors ${
						step.id <= currentStep
							? "bg-primary"
							: "bg-surface-container-highest"
					}`}
					key={step.id}
					title={step.label}
				/>
			))}
		</div>
	);
}
