import { useCallback, useEffect, useState } from "react";
import { Dialog } from "../components/Dialog";
import { formatAudienceRegion } from "../utils/audienceRegion";
import { useToast } from "../components/toastContext";
import { authService, type CurrentUser } from "../services/api/authService";
import { getApiErrorMessage } from "../services/api/apiService";
import { pollService, type PublicPoll, type PublicPollLiveMetrics } from "../services/api/pollService";
import {
	createPollSocket,
	joinPollRoom,
	leavePollRoom,
	type PollAnalyticsEvent,
	type PollVoteEvent,
} from "../services/realtime/pollSocket";

type Answers = Record<string, string | string[]>;

function getSlugFromPath() {
	const match = window.location.pathname.match(/\/public\/poll\/([^/]+)$/);
	return match?.[1] ?? "";
}

function getInitials(user: CurrentUser) {
	const source = user.name || user.email;
	return source
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}

export default function PublicPoll() {
	const toast = useToast();
	const slug = getSlugFromPath();
	const [poll, setPoll] = useState<PublicPoll | null>(null);
	const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
	const [answers, setAnswers] = useState<Answers>({});
	const [isLoading, setIsLoading] = useState(true);
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [liveMetrics, setLiveMetrics] = useState<PublicPollLiveMetrics | null>(null);

	const showError = useCallback(
		(message: string) => {
			setError(message);
			toast.error(message);
		},
		[toast],
	);

	useEffect(() => {
		void (async () => {
			setIsLoading(true);
			setError(null);
			setAnswers({});
			setIsSubmitted(false);
			setIsSubmitting(false);

			try {
				const loadedPoll = await pollService.getPublicPollBySlug(slug);
				setPoll(loadedPoll);
				setLiveMetrics(await pollService.getPublicPollLiveMetrics(slug));
			} catch (loadError) {
				console.error("Unable to load public poll:", loadError);
				showError(
					getApiErrorMessage(
						loadError,
						"This poll is not available.",
					),
				);
			} finally {
				setIsLoading(false);
			}
		})();
	}, [showError, slug]);

	useEffect(() => {
		if (!poll) return;

		const socket = createPollSocket();
		const joinCurrentPoll = () => joinPollRoom(socket, poll.id);

		socket.on("connect", joinCurrentPoll);
		joinCurrentPoll();

		socket.on("poll:vote", (event: PollVoteEvent) => {
			if (event.pollId !== poll.id) return;

			setLiveMetrics((currentMetrics) => ({
				pollId: poll.id,
				liveCounts: {
					...(currentMetrics?.liveCounts ?? {}),
					[event.optionId]: event.count,
				},
				totalVotes: event.totalVotes,
				activeViewers: currentMetrics?.activeViewers ?? 0,
			}));
		});

		socket.on("poll:analytics", (event: PollAnalyticsEvent) => {
			if (event.pollId !== poll.id) return;

			setLiveMetrics((currentMetrics) => ({
				pollId: poll.id,
				liveCounts: currentMetrics?.liveCounts ?? {},
				totalVotes: event.totalVotes ?? currentMetrics?.totalVotes ?? 0,
				activeViewers: event.activeViewers ?? currentMetrics?.activeViewers ?? 0,
				regions: event.regions ?? currentMetrics?.regions,
			}));
		});

		return () => {
			leavePollRoom(socket, poll.id);
			socket.disconnect();
		};
	}, [poll]);

	const checkCurrentUser = useCallback(async () => {
		setIsCheckingAuth(true);

		try {
			const user = await authService.getOptionalCurrentUser();
			setCurrentUser(user);

			if (!user) {
				setIsSubmitted(false);
			}

			return user;
		} finally {
			setIsCheckingAuth(false);
		}
	}, []);

	useEffect(() => {
		void (async () => {
			await Promise.resolve();
			await checkCurrentUser();
		})();

		const handlePageShow = () => {
			void checkCurrentUser();
		};

		window.addEventListener("pageshow", handlePageShow);

		return () => {
			window.removeEventListener("pageshow", handlePageShow);
		};
	}, [checkCurrentUser]);

	const selectSingle = (questionId: string, optionId: string) => {
		setAnswers((currentAnswers) => ({
			...currentAnswers,
			[questionId]: optionId,
		}));
	};

	const toggleMultiple = (questionId: string, optionId: string) => {
		setAnswers((currentAnswers) => {
			const selectedOptions = Array.isArray(currentAnswers[questionId])
				? currentAnswers[questionId]
				: [];

			return {
				...currentAnswers,
				[questionId]: selectedOptions.includes(optionId)
					? selectedOptions.filter((id) => id !== optionId)
					: [...selectedOptions, optionId],
			};
		});
	};

	const validateAnswers = () => {
		if (!poll) return false;

		const unansweredRequiredQuestion = poll.questions.find((question) => {
			if (!question.isRequired) return false;

			const answer = answers[question.id];
			return Array.isArray(answer) ? answer.length === 0 : !answer;
		});

		if (unansweredRequiredQuestion) {
			showError("Please answer all required questions.");
			return false;
		}

		setError(null);
		return true;
	};

	const submitPoll = async () => {
		if (!poll || isCheckingAuth || isSubmitting) return;

		if (poll.responseMode === "authenticated") {
			const verifiedUser = await checkCurrentUser();

			if (!verifiedUser) {
				setCurrentUser(null);
				setIsSubmitted(false);
				showError("Please sign in before submitting this poll.");
				return;
			}
		}

		if (!validateAnswers()) return;

		setIsSubmitting(true);

		try {
			const submittedResponse = await pollService.submitPublicPollResponse(slug, {
				answers: Object.entries(answers)
					.map(([questionId, answer]) => ({
						questionId,
						optionIds: Array.isArray(answer) ? answer : [answer],
					}))
					.filter((answer) => answer.optionIds.length > 0),
			});
			setLiveMetrics((currentMetrics) => ({
				pollId: submittedResponse.pollId,
				liveCounts: {
					...(currentMetrics?.liveCounts ?? {}),
					...submittedResponse.liveCounts,
				},
				totalVotes: submittedResponse.totalVotes,
				activeViewers: currentMetrics?.activeViewers ?? 0,
				regions: currentMetrics?.regions,
			}));
			setError(null);
			setIsSubmitted(true);
		} catch (submitError) {
			console.error(
				"Unable to submit public poll response:",
				submitError,
			);
			setIsSubmitted(false);
			showError(
				getApiErrorMessage(
					submitError,
					"Unable to submit response. Please try again.",
				),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<main className="min-h-screen bg-surface p-xl text-on-surface">
				<p className="mx-auto max-w-3xl rounded-xl border border-outline-variant bg-surface-container p-xl">
					Loading poll...
				</p>
			</main>
		);
	}

	if (error && !poll) {
		return (
			<main className="min-h-screen bg-surface p-xl text-on-surface">
				<p className="mx-auto max-w-3xl rounded-xl border border-error-container bg-error-container p-xl text-on-error-container">
					{error}
				</p>
			</main>
		);
	}

	if (!poll) return null;

	const requiresAuthentication = poll.responseMode === "authenticated";
	const authBlocked =
		requiresAuthentication && (isCheckingAuth || !currentUser);
	const canRespond = !authBlocked;
	const isResponseLocked = authBlocked || isSubmitted || isSubmitting;
	const answeredCount = poll.questions.filter((question) => {
		const answer = answers[question.id];
		return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
	}).length;
	const requiredCount = poll.questions.filter(
		(question) => question.isRequired,
	).length;

	return (
		<main className="min-h-screen bg-surface text-on-surface">
			<div className="border-b border-outline-variant bg-surface-container-lowest/90">
				<div className="mx-auto flex max-w-6xl items-center justify-between px-md py-md">
					<div className="flex items-center gap-sm">
						<span className="material-symbols-outlined text-primary">
							analytics
						</span>
						<span className="font-serif text-title-lg font-bold text-primary">
							PulseBoard
						</span>
					</div>
					<span className="rounded-full bg-surface-container-high px-3 py-1 font-label-md text-label-md text-on-surface-variant">
						Public poll
					</span>
				</div>
			</div>

			<div className="mx-auto grid max-w-6xl grid-cols-1 gap-gutter px-md py-xl lg:grid-cols-[minmax(0,1fr)_22rem]">
				<div className="space-y-lg">
					<header className="rounded-xl border border-outline-variant bg-surface-container-lowest p-xl shadow-popover">
						<div id="poll-summary" />
						<div className="mb-md flex flex-wrap items-center gap-xs">
							<span className="rounded-full bg-primary-fixed px-3 py-1 font-label-md text-label-md text-on-primary-fixed">
								{poll.responseMode === "authenticated"
									? "Verified responses"
									: "Anonymous responses"}
							</span>
							<span className="rounded-full bg-surface-container-high px-3 py-1 font-label-md text-label-md text-on-surface-variant">
								{poll.questions.length}{" "}
								{poll.questions.length === 1
									? "question"
									: "questions"}
							</span>
							{poll.tags.map((tag) => (
								<span
									className="rounded-full bg-surface-container-high px-3 py-1 font-label-md text-label-md text-on-surface-variant"
									key={tag}>
									{tag}
								</span>
							))}
						</div>
						<h1 className="mb-sm font-serif text-display-md text-primary">
							{poll.title}
						</h1>
						{poll.description ? (
							<p className="font-body-lg text-body-lg text-on-surface-variant">
								{poll.description}
							</p>
						) : null}
						<div className="mt-lg grid grid-cols-1 gap-sm border-t border-outline-variant pt-lg md:grid-cols-3">
							<SummaryMetric
								icon="event"
								label="Closes"
								value={new Date(
									poll.expiresAt,
								).toLocaleString()}
							/>
							<SummaryMetric
								icon="task_alt"
								label="Required"
								value={`${requiredCount} question${requiredCount === 1 ? "" : "s"}`}
							/>
							<SummaryMetric
								icon="how_to_reg"
								label="Access"
								value={
									requiresAuthentication
										? "Sign-in required"
										: "Open response"
								}
							/>
						</div>
					</header>

					{isCheckingAuth && requiresAuthentication ? (
						<section className="rounded-xl border border-outline-variant bg-surface-container p-xl text-center">
							<p className="font-body-md text-on-surface-variant">
								Checking response access...
							</p>
						</section>
					) : (
						<section className="space-y-lg">
							{poll.questions.map((question, questionIndex) => (
								<article
									className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm"
									key={question.id}>
									<div className="mb-md flex flex-wrap items-center gap-sm">
										<span className="rounded-full bg-secondary-container px-3 py-1 font-label-md text-label-md text-on-secondary-container">
											Question {questionIndex + 1}
										</span>
										<span className="rounded-full bg-surface-container-high px-3 py-1 font-label-md text-label-md text-on-surface-variant">
											{question.questionType ===
											"multiple_choice"
												? "Choose multiple"
												: "Choose one"}
										</span>
										{question.isRequired ? (
											<span className="rounded-full bg-primary-container px-3 py-1 font-label-md text-label-md text-on-primary-container">
												Required
											</span>
										) : null}
									</div>
									<h2 className="mb-md font-title-lg text-title-lg text-on-surface">
										{question.questionText}
									</h2>

									<div className="space-y-sm">
										{question.options.map((option) => {
											const answer = answers[question.id];
											const isSelected = Array.isArray(
												answer,
											)
												? answer.includes(option.id)
												: answer === option.id;

											return (
												<button
													className={`flex w-full items-center justify-between rounded-xl border p-md text-left transition-colors ${
														isSelected
															? "border-primary bg-primary-container text-on-primary-container"
															: "border-outline-variant bg-surface-container-lowest hover:border-primary"
													}`}
													key={option.id}
													disabled={isResponseLocked}
													onClick={() =>
														question.questionType ===
														"multiple_choice"
															? toggleMultiple(
																	question.id,
																	option.id,
																)
															: selectSingle(
																	question.id,
																	option.id,
																)
													}
													type="button">
													<span className="font-body-lg text-body-lg">
														{option.optionText}
													</span>
													<span className="material-symbols-outlined">
														{question.questionType ===
														"multiple_choice"
															? isSelected
																? "check_box"
																: "check_box_outline_blank"
															: isSelected
																? "radio_button_checked"
																: "radio_button_unchecked"}
													</span>
												</button>
											);
										})}
									</div>
								</article>
							))}

							{/* {error ? (
							<p className="rounded-md bg-error-container px-md py-sm font-body-md text-on-error-container">
								{error}
							</p>
						) : null} */}

							<button
								className="w-full rounded-full bg-primary-container px-xl py-4 font-label-lg font-bold text-on-primary-container transition-all hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
								disabled={isResponseLocked}
								onClick={() => void submitPoll()}
								type="button">
								{isSubmitting
									? "Submitting..."
									: "Submit Response"}
							</button>
						</section>
					)}
				</div>

				<aside className="space-y-lg lg:sticky lg:top-lg lg:self-start">
					<UserDetailsCard
						currentUser={currentUser}
						isCheckingAuth={isCheckingAuth}
						requiresAuthentication={requiresAuthentication}
					/>
					<ResponseProgressCard
						answeredCount={answeredCount}
						isSubmitted={isSubmitted}
						questionCount={poll.questions.length}
						requiredCount={requiredCount}
					/>
					<LivePollCard
						metrics={liveMetrics}
						poll={poll}
					/>
					<a
						className="flex items-center justify-center gap-xs rounded-full bg-primary-container px-lg py-sm font-label-lg text-on-primary-container"
						href={`/public/poll/${slug}/results`}>
						<span className="material-symbols-outlined text-[18px]">bar_chart</span>
						View results
					</a>
				</aside>
			</div>

			<AuthRequiredDialog
				isOpen={
					!isCheckingAuth && requiresAuthentication && !currentUser
				}
			/>

			<ResponseSubmittedDialog
				isOpen={isSubmitted && canRespond}
				onClose={() => setIsSubmitted(false)}
			/>
		</main>
	);
}

function SummaryMetric({
	icon,
	label,
	value,
}: {
	icon: string;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-start gap-sm rounded-lg bg-surface-container-low p-md">
			<span className="material-symbols-outlined text-[20px] text-primary">
				{icon}
			</span>
			<div className="min-w-0">
				<p className="font-label-md text-label-md text-on-surface-variant">
					{label}
				</p>
				<p className="break-words font-label-lg text-label-lg text-on-surface">
					{value}
				</p>
			</div>
		</div>
	);
}

function UserDetailsCard({
	currentUser,
	isCheckingAuth,
	requiresAuthentication,
}: {
	currentUser: CurrentUser | null;
	isCheckingAuth: boolean;
	requiresAuthentication: boolean;
}) {
	return (
		<section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
			<div className="mb-md flex items-center gap-sm">
				<span className="material-symbols-outlined text-primary">
					account_circle
				</span>
				<h2 className="font-title-lg text-title-lg text-primary">
					Participant
				</h2>
			</div>

			{isCheckingAuth ? (
				<p className="font-body-md text-on-surface-variant">
					Checking session...
				</p>
			) : currentUser ? (
				<div className="space-y-md">
					<div className="flex items-center gap-md">
						{currentUser.picture ? (
							<img
								alt=""
								className="h-12 w-12 rounded-full object-cover"
								src={currentUser.picture}
							/>
						) : (
							<div className="grid h-12 w-12 place-items-center rounded-full bg-primary-container font-label-lg text-on-primary-container">
								{getInitials(currentUser)}
							</div>
						)}
						<div className="min-w-0">
							<p className="truncate font-label-lg text-label-lg text-on-surface">
								{currentUser.name}
							</p>
							<p className="truncate font-body-md text-body-md text-on-surface-variant">
								{currentUser.email}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-xs rounded-lg bg-primary-fixed px-md py-sm text-on-primary-fixed">
						<span className="material-symbols-outlined text-[18px]">
							verified_user
						</span>
						<span className="font-label-md text-label-md">
							Authenticated session
						</span>
					</div>
				</div>
			) : (
				<div className="space-y-md">
					<p className="font-body-md text-on-surface-variant">
						{requiresAuthentication
							? "Sign in to submit a verified response."
							: "You can respond without signing in."}
					</p>
					{!requiresAuthentication ? (
						<button
							className="rounded-full bg-surface-container-low px-4 py-2 font-label-lg text-primary transition-colors hover:bg-surface-container-high"
							onClick={authService.login}
							type="button">
							Sign in
						</button>
					) : null}
				</div>
			)}
		</section>
	);
}

function ResponseProgressCard({
	answeredCount,
	isSubmitted,
	questionCount,
	requiredCount,
}: {
	answeredCount: number;
	isSubmitted: boolean;
	questionCount: number;
	requiredCount: number;
}) {
	const progressPercent =
		questionCount === 0
			? 0
			: Math.round((answeredCount / questionCount) * 100);

	return (
		<section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
			<div className="mb-md flex items-center justify-between gap-md">
				<h2 className="font-title-lg text-title-lg text-primary">
					Response status
				</h2>
				<span className="font-label-md text-label-md text-on-surface-variant">
					{answeredCount}/{questionCount}
				</span>
			</div>
			<div className="mb-md h-2 overflow-hidden rounded-full bg-surface-container-high">
				<div
					className="h-full rounded-full bg-primary-container"
					style={{ width: `${progressPercent}%` }}
				/>
			</div>
			<p className="font-body-md text-body-md text-on-surface-variant">
				{isSubmitted
					? "Your response has been captured."
					: `${requiredCount} required question${requiredCount === 1 ? "" : "s"} in this poll.`}
			</p>
		</section>
	);
}

function LivePollCard({
	metrics,
	poll,
}: {
	metrics: PublicPollLiveMetrics | null;
	poll: PublicPoll;
}) {
	const topOption = poll.questions
		.flatMap((question) => question.options)
		.map((option) => ({
			...option,
			count: metrics?.liveCounts[option.id] ?? 0,
		}))
		.sort((left, right) => right.count - left.count)[0];
	const topRegion = Object.entries(metrics?.regions ?? {})
		.map(([region, count]) => ({ region: formatAudienceRegion(region), count }))
		.sort((left, right) => right.count - left.count)[0];

	return (
		<section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
			<div className="mb-md flex items-center justify-between gap-md">
				<h2 className="font-title-lg text-title-lg text-primary">
					Live activity
				</h2>
				<span className="flex items-center gap-xs rounded-full bg-primary-fixed px-3 py-1 font-label-md text-label-md text-on-primary-fixed">
					<span className="h-2 w-2 rounded-full bg-primary" />
					Live
				</span>
			</div>
			<div className="grid grid-cols-2 gap-sm">
				<SummaryMetric
					icon="how_to_vote"
					label="Votes"
					value={`${metrics?.totalVotes ?? 0}`}
				/>
				<SummaryMetric
					icon="visibility"
					label="Viewing"
					value={`${metrics?.activeViewers ?? 0}`}
				/>
			</div>
			{topOption ? (
				<p className="mt-md rounded-lg bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface-variant">
					Top option: <span className="font-label-lg text-primary">{topOption.optionText}</span>
				</p>
			) : null}
			{topRegion ? (
				<p className="mt-sm rounded-lg bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface-variant">
					Top region: <span className="font-label-lg text-primary">{topRegion.region}</span>
				</p>
			) : null}
		</section>
	);
}

function AuthRequiredDialog({ isOpen }: { isOpen: boolean }) {
	return (
		<Dialog
			description="This poll requires a verified response to ensure data integrity and prevent duplicate submissions. Please sign in to continue."
			icon="lock_person"
			isOpen={isOpen}
			title="Verification Required"
			tone="auth">
			<div className="space-y-md">
				<button
					className="flex w-full items-center justify-center gap-md rounded-full border border-outline-variant bg-surface-container-lowest px-lg py-4 font-label-lg text-on-surface transition-all hover:bg-surface-container-highest active:scale-[0.98]"
					onClick={authService.login}
					type="button">
					<svg
						className="h-5 w-5"
						viewBox="0 0 24 24">
						<path
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							fill="#4285F4"
						/>
						<path
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							fill="#34A853"
						/>
						<path
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
							fill="#FBBC05"
						/>
						<path
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							fill="#EA4335"
						/>
					</svg>
					Continue with Google
				</button>

				<button
					className="flex w-full items-center justify-center gap-md rounded-full bg-primary-container px-lg py-4 font-label-lg text-on-primary-container shadow-sm transition-all hover:bg-opacity-90 active:scale-[0.98]"
					onClick={authService.login}
					type="button">
					<span className="material-symbols-outlined">mail</span>
					Sign in with Email
				</button>
			</div>

			<div className="mt-lg border-t border-outline-variant pt-lg text-center">
				<button
					className="font-label-lg text-primary transition-all hover:underline"
					onClick={authService.register}
					type="button">
					Create a PulseBoard account
				</button>
			</div>
		</Dialog>
	);
}

function ResponseSubmittedDialog({
	isOpen,
	onClose,
}: {
	isOpen: boolean;
	onClose: () => void;
}) {
	return (
		<Dialog
			actions={
				<button
					className="rounded-full bg-primary-container px-6 py-3 font-label-lg font-bold text-on-primary-container transition-colors hover:bg-primary"
					onClick={onClose}
					type="button">
					Back to poll
				</button>
			}
			description="Thanks for responding. Your vote is live now and will be persisted in the background."
			icon="check_circle"
			isOpen={isOpen}
			onClose={onClose}
			title="Response captured"
			tone="success"
		/>
	);
}
