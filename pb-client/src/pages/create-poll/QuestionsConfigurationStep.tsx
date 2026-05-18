import { type DragEvent, type FormEvent, useState } from "react";
import type { QuestionType, SavedQuestion } from "./types";

type DraftQuestionOption = {
	clientId: string;
	optionText: string;
};

type QuestionsConfigurationStepProps = {
	pollId: string | null;
	questions: SavedQuestion[];
	isSubmitting: boolean;
	onAddQuestion: (question: {
		questionText: string;
		questionType: QuestionType;
		isRequired: boolean;
		options: Array<{ optionText: string }>;
	}) => Promise<boolean>;
	onUpdateQuestion: (
		questionId: string,
		question: {
			questionText: string;
			questionType: QuestionType;
			isRequired: boolean;
			options: Array<{ optionText: string }>;
		}
	) => Promise<boolean>;
	onDeleteQuestion: (questionId: string) => Promise<void>;
};

export function QuestionsConfigurationStep({
	pollId,
	questions,
	isSubmitting,
	onAddQuestion,
	onUpdateQuestion,
	onDeleteQuestion,
}: QuestionsConfigurationStepProps) {
	const [questionText, setQuestionText] = useState("");
	const [questionType, setQuestionType] = useState<QuestionType>("single_choice");
	const [isRequired, setIsRequired] = useState(true);
	const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
	const [options, setOptions] = useState<DraftQuestionOption[]>([
		createDraftOption(),
		createDraftOption(),
	]);
	const [draggedOptionIndex, setDraggedOptionIndex] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	function createDraftOption(): DraftQuestionOption {
		return {
			clientId: crypto.randomUUID(),
			optionText: "",
		};
	}

	const updateOption = (index: number, optionText: string) => {
		setOptions((currentOptions) =>
			currentOptions.map((option, optionIndex) =>
				optionIndex === index ? { ...option, optionText } : option
			)
		);
	};

	const addOption = () => {
		setOptions((currentOptions) => [...currentOptions, createDraftOption()]);
	};

	const removeOption = (index: number) => {
		setOptions((currentOptions) => currentOptions.filter((_, optionIndex) => optionIndex !== index));
	};

	const resetForm = () => {
		setQuestionText("");
		setQuestionType("single_choice");
		setIsRequired(true);
		setOptions([createDraftOption(), createDraftOption()]);
		setDraggedOptionIndex(null);
		setEditingQuestionId(null);
	};

	const editQuestion = (question: SavedQuestion) => {
		setQuestionText(question.questionText);
		setQuestionType(question.questionType);
		setIsRequired(question.isRequired);
		setEditingQuestionId(question.id);
		setOptions(
			question.options.map((option) => ({
				clientId: option.id,
				optionText: option.optionText,
			}))
		);
	};

	const moveOption = (fromIndex: number, toIndex: number) => {
		if (fromIndex === toIndex) return;

		setOptions((currentOptions) => {
			const nextOptions = [...currentOptions];
			const [movedOption] = nextOptions.splice(fromIndex, 1);

			if (!movedOption) return currentOptions;

			nextOptions.splice(toIndex, 0, movedOption);
			return nextOptions;
		});
	};

	const handleOptionDragStart = (index: number) => {
		setDraggedOptionIndex(index);
	};

	const handleOptionDragOver = (event: DragEvent<HTMLDivElement>, index: number) => {
		event.preventDefault();

		if (draggedOptionIndex === null || draggedOptionIndex === index) return;

		moveOption(draggedOptionIndex, index);
		setDraggedOptionIndex(index);
	};

	const handleOptionDragEnd = () => {
		setDraggedOptionIndex(null);
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);

		const cleanedOptions = options
			.map((option) => ({ optionText: option.optionText.trim() }))
			.filter((option) => option.optionText);

		if (!pollId) {
			setError("Create the draft poll before adding questions.");
			return;
		}

		if (!questionText.trim()) {
			setError("Question text is required.");
			return;
		}

		if (cleanedOptions.length < 2) {
			setError("Add at least two options.");
			return;
		}

		const payload = {
			questionText: questionText.trim(),
			questionType,
			isRequired,
			options: cleanedOptions,
		};

		const wasSaved = editingQuestionId
			? await onUpdateQuestion(editingQuestionId, payload)
			: await onAddQuestion(payload);

		if (wasSaved) {
			resetForm();
		}
	};

	return (
		<section className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
			<div className="md:col-span-8 flex flex-col gap-lg">
				<form
					className="bg-surface-container p-xl rounded-xl border border-outline-variant"
					onSubmit={handleSubmit}>
					<div className="mb-lg flex flex-col gap-xs">
						<span className="font-label-md text-label-md text-secondary">
							{editingQuestionId ? "Editing question" : `Question ${questions.length + 1}`}
						</span>
						<h3 className="font-title-lg text-title-lg text-on-surface">
							{editingQuestionId
								? "Update this question and its answers"
								: "Add a question and configure its answers"}
						</h3>
					</div>

					<div className="flex flex-col gap-md">
						<div className="flex flex-col gap-xs">
							<label className="font-label-lg text-label-lg font-Inter text-secondary ml-xs">
								Question Text
							</label>
							<input
								className="w-full bg-surface-container-low border-b-2 border-outline focus:border-primary-container outline-none py-md px-md rounded-t-lg font-title-lg text-title-lg font-Literata text-on-surface transition-all placeholder:text-outline-variant"
								onChange={(event) => setQuestionText(event.target.value)}
								placeholder="What is your primary focus for this quarter?"
								type="text"
								value={questionText}
							/>
						</div>

						<div className="mt-lg flex flex-col gap-md">
							<label className="font-label-lg text-label-lg font-Inter text-secondary ml-xs">
								Response Options
							</label>

							{options.map((option, index) => (
								<div
									className={`flex items-center gap-md bg-surface-container-lowest p-sm rounded-lg border border-outline-variant group transition-all ${
										draggedOptionIndex === index
											? "border-primary-container bg-surface-container-high"
											: ""
									}`}
									draggable
									key={option.clientId}
									onDragEnd={handleOptionDragEnd}
									onDragOver={(event) => handleOptionDragOver(event, index)}
									onDragStart={() => handleOptionDragStart(index)}>
									<span
										aria-label="Drag option"
										className="material-symbols-outlined text-outline-variant cursor-grab"
										role="img">
										drag_indicator
									</span>
									<input
										className="flex-grow bg-transparent border-none outline-none font-body-lg text-body-lg font-Inter text-on-surface p-xs"
										onChange={(event) => updateOption(index, event.target.value)}
										placeholder={`Option ${index + 1}`}
										type="text"
										value={option.optionText}
									/>
									<span className="font-label-md text-label-md text-outline">
										#{index + 1}
									</span>
									<button
										className="p-xs text-outline hover:text-error transition-colors disabled:cursor-not-allowed disabled:opacity-40"
										disabled={options.length <= 2}
										onClick={() => removeOption(index)}
										type="button">
										<span className="material-symbols-outlined">
											delete
										</span>
									</button>
								</div>
							))}

							<button
								className="flex items-center justify-center gap-sm py-md border-2 border-dashed border-outline-variant rounded-lg font-label-lg text-label-lg font-Inter text-secondary hover:bg-surface-container-high hover:border-primary-container transition-all"
								onClick={addOption}
								type="button">
								<span className="material-symbols-outlined">
									add_circle
								</span>
								Add Option
							</button>
						</div>
					</div>

					{error ? (
						<p className="mt-md rounded-md bg-error-container px-md py-sm font-sans text-body-md text-on-error-container">
							{error}
						</p>
					) : null}

					<div className="mt-lg flex flex-col gap-md md:flex-row">
						<button
							className="w-full rounded-full bg-primary-container px-6 py-3 font-sans text-label-lg font-bold text-on-primary-container transition-all hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
							disabled={isSubmitting}
							type="submit">
							{isSubmitting
								? "Saving Question..."
								: editingQuestionId
									? "Update Question"
									: "Save Question & Add Another"}
						</button>
						{editingQuestionId ? (
							<button
								className="w-full rounded-full bg-surface-container-low px-6 py-3 font-sans text-label-lg font-bold text-primary transition-all hover:bg-surface-container-high md:w-auto"
								onClick={resetForm}
								type="button">
								Cancel Edit
							</button>
						) : null}
					</div>
				</form>

				{questions.length > 0 ? (
					<div className="space-y-md">
						{questions.map((question, index) => (
							<article
								className="rounded-xl border border-outline-variant bg-surface-container-low p-md"
								key={question.id}>
								<div className="mb-sm flex items-center justify-between gap-md">
									<h3 className="font-title-lg text-title-lg text-on-surface">
										{index + 1}. {question.questionText}
									</h3>
									<span className="rounded-full bg-secondary-container px-3 py-1 font-label-md text-label-md text-on-secondary-container">
										{question.questionType === "multiple_choice"
											? "Multiple choice"
											: "Single choice"}
									</span>
								</div>
								<p className="mb-sm font-label-md text-label-md text-on-surface-variant">
									{question.isRequired ? "Required answer" : "Optional answer"}
								</p>
								<ul className="space-y-xs">
									{question.options.map((option) => (
										<li
											className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm font-body-md text-body-md text-on-surface"
											key={option.id}>
											{option.optionText}
										</li>
									))}
								</ul>
								<div className="mt-md flex flex-wrap gap-sm">
									<button
										className="rounded-full bg-primary-container px-4 py-2 font-label-md text-on-primary-container"
										onClick={() => editQuestion(question)}
										type="button">
										Edit
									</button>
									<button
										className="rounded-full bg-error-container px-4 py-2 font-label-md text-on-error-container"
										onClick={() => void onDeleteQuestion(question.id)}
										type="button">
										Delete
									</button>
								</div>
							</article>
						))}
					</div>
				) : null}
			</div>

			<aside className="md:col-span-4 flex flex-col gap-lg">
				<div className="bg-surface-container-low p-lg rounded-xl border border-outline-variant flex flex-col gap-lg">
					<h3 className="font-title-lg text-title-lg font-Literata text-primary">
						Settings
					</h3>

					<div className="flex flex-col gap-xs">
						<label className="font-label-md text-label-md font-Inter text-secondary">
							Response Type
						</label>
						<div className="relative">
							<select
								className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-md px-md appearance-none font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary-container/20 focus:border-primary transition-all"
								onChange={(event) => setQuestionType(event.target.value as QuestionType)}
								value={questionType}>
								<option value="single_choice">Single Choice</option>
								<option value="multiple_choice">Multiple Choice</option>
							</select>
							<span className="material-symbols-outlined absolute right-3 top-3 text-outline pointer-events-none">
								expand_more
							</span>
						</div>
					</div>

					<div className="flex items-center justify-between py-sm">
						<div className="flex flex-col">
							<span className="font-label-lg text-label-lg font-Inter text-on-surface">
								Required answer
							</span>
							<span className="font-label-md text-label-md font-Inter text-on-surface-variant">
								Voters must respond
							</span>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								checked={isRequired}
								className="sr-only peer"
								onChange={(event) => setIsRequired(event.target.checked)}
								type="checkbox"
							/>
							<span className="block h-6 w-11 rounded-full bg-surface-container-highest transition-colors peer-checked:bg-primary-container"></span>
							<span className="absolute start-[2px] top-[2px] h-5 w-5 rounded-full border border-gray-300 bg-white transition-transform peer-checked:translate-x-full"></span>
						</label>
					</div>
					<div className="h-px bg-outline-variant w-full"></div>

					<div className="flex flex-col gap-sm">
						<span className="font-label-md text-label-md font-Inter text-secondary">
							Inquiry Imagery
						</span>
						<div className="aspect-video bg-surface-container rounded-lg border border-outline-variant flex flex-col items-center justify-center text-outline-variant gap-sm hover:bg-surface-container-high transition-all cursor-pointer">
							<span className="material-symbols-outlined text-4xl">
								image
							</span>
							<span className="font-label-md">
								Click to upload media
							</span>
						</div>
					</div>
				</div>

				<div className="bg-primary text-on-primary-container p-lg rounded-xl border border-primary-container shadow-sm">
					<div className="flex items-center gap-sm mb-sm">
						<span className="material-symbols-outlined">
							lightbulb
						</span>
						<h4 className="font-label-lg font-bold">
							Designer Tip
						</h4>
					</div>
					<p className="font-body-md text-body-md leading-relaxed opacity-90">
						Shorter questions (under 15 words) tend to receive 24%
						more engagement in mindful reading environments.
					</p>
				</div>
			</aside>
		</section>
	);
}
