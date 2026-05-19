import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import { useToast } from "../../components/toastContext";
import type { PollRequirements, SavedQuestion } from "./types";

type ReviewPublishStepProps = {
	pollId: string | null;
	publicSlug: string | null;
	requirements: PollRequirements;
	questions: SavedQuestion[];
	isPublishDialogOpen: boolean;
	onClosePublishDialog: () => void;
	onFinishPublish: () => void;
};

function getExpiryLabel(requirements: PollRequirements) {
	if (!requirements.expiresDate || !requirements.expiresTime)
		return "No expiry set";

	return new Date(
		`${requirements.expiresDate}T${requirements.expiresTime}`,
	).toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

function getPollLink(publicSlug: string | null, pollId: string | null) {
	const origin =
		typeof window === "undefined"
			? "pulseboard.com"
			: window.location.origin;
	const slug = publicSlug || pollId;

	return slug
		? `${origin}/public/poll/${slug}`
		: "Draft link will appear after save";
}

export function ReviewPublishStep({
	pollId,
	publicSlug,
	requirements,
	questions,
	isPublishDialogOpen,
	onClosePublishDialog,
	onFinishPublish,
}: ReviewPublishStepProps) {
	const toast = useToast();
	const [copyLabel, setCopyLabel] = useState("Copy Link");
	const pollLink = getPollLink(
		publicSlug || requirements.publicSlug || null,
		pollId,
	);
	const tags = requirements.tags
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);

	const copyPollLink = async () => {
		if (!pollId) return;

		try {
			await navigator.clipboard.writeText(pollLink);
			setCopyLabel("Copied");
			toast.success("Poll link copied.");
			window.setTimeout(() => setCopyLabel("Copy Link"), 1500);
		} catch (copyError) {
			console.error("Unable to copy poll link:", copyError);
			toast.error("Unable to copy poll link.");
		}
	};

	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
				<div className="md:col-span-8 bg-surface-container rounded-xl p-lg border border-outline-variant">
					<div className="flex items-center gap-sm mb-md">
						<span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-label-md text-label-md">
							LIVE PREVIEW
						</span>
						<span className="text-outline font-label-md text-label-md">
							Ends {getExpiryLabel(requirements)}
						</span>
					</div>
					<h2 className="font-title-lg text-title-lg text-on-surface mb-lg">
						{requirements.title}
					</h2>

					<div className="space-y-lg">
						{questions.length > 0 ? (
							questions.map((question, questionIndex) => (
								<section
									className="rounded-xl border border-outline-variant bg-surface-container-low p-md"
									key={question.id}>
									<div className="mb-md flex flex-col gap-xs">
										<div className="flex flex-wrap items-center gap-sm">
											<span className="rounded-full bg-secondary-container px-3 py-1 font-label-md text-label-md text-on-secondary-container">
												Question {questionIndex + 1}
											</span>
											<span className="rounded-full bg-surface-container-high px-3 py-1 font-label-md text-label-md text-on-surface-variant">
												{question.questionType ===
												"multiple_choice"
													? "Multiple choice"
													: "Single choice"}
											</span>
											<span className="rounded-full bg-surface-container-high px-3 py-1 font-label-md text-label-md text-on-surface-variant">
												{question.isRequired
													? "Required"
													: "Optional"}
											</span>
										</div>
										<h3 className="font-title-md text-title-md text-on-surface">
											{question.questionText}
										</h3>
									</div>

									<div className="space-y-sm">
										{question.options.map((option) => (
											<button
												className="w-full text-left p-md rounded-xl bg-surface-container-lowest border border-outline-variant hover:border-primary hover:bg-surface-container-high transition-all group flex justify-between items-center"
												key={option.id}
												type="button">
												<span className="font-body-lg text-body-lg text-on-surface">
													{option.optionText}
												</span>
												<span className="material-symbols-outlined text-outline group-hover:text-primary">
													{question.questionType ===
													"multiple_choice"
														? "check_box_outline_blank"
														: "radio_button_unchecked"}
												</span>
											</button>
										))}
									</div>
								</section>
							))
						) : (
							<p className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md font-body-md text-body-md text-on-surface-variant">
								Add at least one question before publishing.
							</p>
						)}
					</div>
					<div className="mt-xl flex justify-between items-center border-t border-outline-variant pt-lg">
						<div className="flex items-center gap-xs">
							<span className="material-symbols-outlined text-secondary">
								verified
							</span>
							<span className="font-label-lg text-label-lg text-secondary">
								{requirements.responseMode === "authenticated"
									? "Verified Participants Only"
									: "Anonymous Participants"}
							</span>
						</div>
						<span className="font-label-lg text-label-lg text-outline">
							0 Votes cast
						</span>
					</div>
				</div>

				<div className="md:col-span-4 flex flex-col gap-gutter">
					<div className="bg-surface-container-low rounded-xl p-md border border-outline-variant">
						<h3 className="font-label-lg text-label-lg text-primary mb-md flex items-center gap-xs">
							<span className="material-symbols-outlined text-[18px]">
								settings
							</span>
							Distribution Settings
						</h3>
						<ul className="space-y-sm">
							<li className="flex justify-between items-center">
								<span className="text-on-surface-variant font-label-md">
									Privacy
								</span>
								<span className="text-on-surface font-label-md font-bold">
									{requirements.responseMode ===
									"authenticated"
										? "Authenticated"
										: "Anonymous"}
								</span>
							</li>
							<li className="flex justify-between items-center">
								<span className="text-on-surface-variant font-label-md">
									Questions
								</span>
								<span className="text-on-surface font-label-md font-bold">
									{questions.length}
								</span>
							</li>
							<li className="flex justify-between items-center gap-md">
								<span className="text-on-surface-variant font-label-md">
									Slug
								</span>
								<span className="text-right text-on-surface font-label-md font-bold break-all">
									{publicSlug ||
										requirements.publicSlug ||
										"Auto generated"}
								</span>
							</li>
							<li className="flex justify-between items-center">
								<span className="text-on-surface-variant font-label-md">
									Status
								</span>
								<span className="text-on-surface font-label-md font-bold">
									Draft
								</span>
							</li>
						</ul>
						{tags.length > 0 ? (
							<div className="mt-md flex flex-wrap gap-xs">
								{tags.map((tag) => (
									<span
										className="rounded-full bg-surface-container-high px-3 py-1 font-label-md text-label-md text-on-surface-variant"
										key={tag}>
										{tag}
									</span>
								))}
							</div>
						) : null}
					</div>

					<div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant flex flex-col h-full">
						<img
							className="w-full h-40 object-cover"
							data-alt="A serene, minimalist office space with high-quality natural light streaming through large windows. The scene captures a clean wooden desk with a single porcelain cup, reflecting a peaceful environment for remote work. The color palette consists of soft greens, warm wood tones, and cool stone grays, echoing a digital mindfulness brand aesthetic."
							src="https://lh3.googleusercontent.com/aida-public/AB6AXuB96NjWiJJz3VSg57ZynVUEo60f5fUobVikJc3sQwqIqQOBF9_cVEdk-Veo4emPIBX43UAQM-WRfx6MhIRJY6FZzJ40nuAm41MNv2TFmVlulIZO03-GHC-jg_k8p-3CL_5SCCelgXBfaRpElkaAk57MKGxkPjxSWa57UHAcT1sbO66q2Ny7R--N_KRBJxhZ49mAK7ki7X6wvUKVBAnc8mgTzzPhfTW5YzSOg4JEEeFAqhr5pUxnGJ1Hy-CvV2lN5TIYKq3tMqiWtgEo"
						/>
						<div className="p-md">
							<h4 className="font-title-lg text-title-lg text-primary text-[16px] leading-tight mb-xs">
								Editorial Context
							</h4>
							<p className="font-body-md text-body-md text-on-surface-variant">
								Your poll will be featured in the "Future of
								Workspace" curated collection.
							</p>
						</div>
					</div>
				</div>
			</div>

			<div
				className="mt-xl bg-primary-fixed text-on-primary-fixed p-lg rounded-xl border border-primary-container/20"
				id="success-state">
				<div className="flex items-start gap-md">
					<div className="bg-primary text-white rounded-full p-2">
						<span className="material-symbols-outlined">
							check_circle
						</span>
					</div>
					<div className="flex-1">
						<h2 className="font-title-lg text-title-lg mb-xs">
							Ready for the world
						</h2>
						<p className="font-body-md mb-lg">
							Your poll is staged and ready to be launched. Once
							you hit publish, the link below will become active.
						</p>
						<div className="bg-surface/50 p-md rounded-lg flex items-center justify-between border border-primary-container/20">
							<code className="font-label-lg text-primary break-all">
								{pollLink}
							</code>
							<button
								className="flex items-center gap-xs bg-primary text-on-primary-container px-4 py-2 rounded-full font-label-md hover:bg-primary-container transition-colors disabled:cursor-not-allowed disabled:opacity-60"
								disabled={!pollId}
								onClick={() => void copyPollLink()}
								type="button">
								<span className="material-symbols-outlined text-[18px]">
									content_copy
								</span>
								{copyLabel}
							</button>
						</div>
					</div>
				</div>
			</div>

			{isPublishDialogOpen ? (
				<SuccessDialog
					onClose={onClosePublishDialog}
					onDone={onFinishPublish}
					onCopyLink={copyPollLink}
					pollLink={pollLink}
					copyLabel={copyLabel}
				/>
			) : null}
		</>
	);
}

type SuccessDialogProps = {
	pollLink: string;
	copyLabel: string;
	onCopyLink: () => void;
	onClose: () => void;
	onDone: () => void;
};

export function SuccessDialog({
	pollLink,
	copyLabel,
	onCopyLink,
	onClose,
	onDone,
}: SuccessDialogProps) {
	return (
		<Dialog
			icon="check_circle"
			isOpen
			onClose={onClose}
			title="Poll published"
			tone="success"
			description="Your poll is live. Share this link with your participants.">
			<div className="flex flex-col gap-md rounded-lg border border-outline-variant bg-surface-container-low p-md md:flex-row md:items-center md:justify-between">
				<code className="break-all font-label-lg text-primary">
					{pollLink}
				</code>
				<button
					className="flex items-center justify-center gap-xs rounded-full bg-primary px-4 py-2 font-label-md text-on-primary-container transition-colors hover:bg-primary-container"
					onClick={onCopyLink}
					type="button">
					<span className="material-symbols-outlined text-[18px]">
						content_copy
					</span>
					{copyLabel}
				</button>
			</div>
			<button
				className="mt-lg rounded-full bg-surface-container-low px-6 py-3 font-label-lg font-bold text-primary transition-colors hover:bg-surface-container-high"
				onClick={onDone}
				type="button">
				Go to My Polls
			</button>
		</Dialog>
	);
}
