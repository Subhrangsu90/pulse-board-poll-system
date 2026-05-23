import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import {
	BarChart,
	LineChart,
	PieChart,
	type BarSeriesOption,
	type LineSeriesOption,
	type PieSeriesOption,
} from "echarts/charts";
import {
	GridComponent,
	LegendComponent,
	TooltipComponent,
	type GridComponentOption,
	type LegendComponentOption,
	type TooltipComponentOption,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { Skeleton } from "../components/Skeleton";
import { useToast } from "../components/toastContext";
import { getApiErrorMessage } from "../services/api/apiService";
import {
	pollService,
	type Poll,
	type PollResults,
} from "../services/api/pollService";
import {
	createPollSocket,
	joinPollRoom,
	leavePollRoom,
	type PollAnalyticsEvent,
	type PollVoteEvent,
} from "../services/realtime/pollSocket";
import { aggregateAudienceRegions } from "../utils/audienceRegion";
import { subscribeToSystemTheme } from "../utils/theme";
import { useWorkspacePreferences } from "../components/workspacePreferencesContext";

echarts.use([
	BarChart,
	CanvasRenderer,
	GridComponent,
	LegendComponent,
	LineChart,
	PieChart,
	TooltipComponent,
]);

type EChartsOption = echarts.ComposeOption<
	| BarSeriesOption
	| GridComponentOption
	| LegendComponentOption
	| LineSeriesOption
	| PieSeriesOption
	| TooltipComponentOption
>;

function getInitialPollId() {
	return new URLSearchParams(window.location.search).get("pollId");
}

function formatDateTime(value: string | null) {
	if (!value) return "No responses yet";

	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}

function getPollLink(poll: PollResults["poll"]) {
	if (!poll.publicSlug) return null;

	return `${window.location.origin}/public/poll/${poll.publicSlug}`;
}

function getTimeRemaining(expiresAt: string) {
	const diffMs = new Date(expiresAt).getTime() - Date.now();

	if (diffMs <= 0) return "Closed";

	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const days = Math.floor(diffHours / 24);
	const hours = diffHours % 24;

	if (days > 0) return `${days}d ${hours}h remaining`;
	return `${hours}h remaining`;
}

function getStatusClass(status: Poll["status"]) {
	if (status === "active")
		return "bg-primary-container text-on-primary-container";
	if (status === "completed")
		return "bg-secondary-container text-on-secondary-container";
	if (status === "expired")
		return "bg-error-container text-on-error-container";
	return "bg-surface-container-high text-on-surface-variant";
}

function applyLiveVote(
	results: PollResults,
	event: PollVoteEvent,
): PollResults {
	if (results.poll.id !== event.pollId) return results;

	const queuedResponseId = `queued-${event.submissionId ?? `${event.pollId}-${event.submittedAt ?? Date.now()}`}`;
	const isNewSubmission = !results.recentResponses.some(
		(response) => response.id === queuedResponseId,
	);
	const questions = results.questions.map((question) => {
		const hasOption = question.options.some(
			(option) => option.id === event.optionId,
		);

		if (!hasOption) return question;

		const options = question.options.map((option) => ({
			...option,
			selectionCount:
				option.id === event.optionId
					? event.count
					: option.selectionCount,
		}));
		const totalSelections = options.reduce(
			(total, option) => total + option.selectionCount,
			0,
		);

		return {
			...question,
			responseCount: Math.max(question.responseCount, event.totalVotes),
			totalSelections,
			options: options.map((option) => ({
				...option,
				percentage:
					totalSelections === 0
						? 0
						: Math.round(
								(option.selectionCount / totalSelections) * 100,
							),
			})),
		};
	});

	return {
		...results,
		summary: {
			...results.summary,
			totalResponses: Math.max(
				results.summary.totalResponses,
				event.totalVotes,
			),
			totalAnswerSelections: questions.reduce(
				(total, question) => total + question.totalSelections,
				0,
			),
			anonymousResponses:
				isNewSubmission && (event.isAnonymous ?? true)
					? results.summary.anonymousResponses + 1
					: results.summary.anonymousResponses,
			authenticatedResponses:
				isNewSubmission && event.isAnonymous === false
					? results.summary.authenticatedResponses + 1
					: results.summary.authenticatedResponses,
			lastSubmittedAt: new Date().toISOString(),
		},
		questions,
		recentResponses: isNewSubmission
			? [
					{
						id: queuedResponseId,
						submittedAt:
							event.submittedAt ?? new Date().toISOString(),
						isAnonymous: event.isAnonymous ?? true,
						answerCount: event.answerCount ?? 1,
						status: "queued" as const,
					},
					...results.recentResponses,
				].slice(0, 10)
			: results.recentResponses,
	};
}

function preserveLiveResults(
	currentResults: PollResults | null,
	refreshedResults: PollResults,
) {
	if (
		!currentResults ||
		currentResults.poll.id !== refreshedResults.poll.id
	) {
		return refreshedResults;
	}

	if (
		refreshedResults.summary.totalResponses >=
		currentResults.summary.totalResponses
	) {
		return refreshedResults;
	}

	return {
		...refreshedResults,
		summary: {
			...refreshedResults.summary,
			totalResponses: currentResults.summary.totalResponses,
			totalAnswerSelections: Math.max(
				refreshedResults.summary.totalAnswerSelections,
				currentResults.summary.totalAnswerSelections,
			),
			anonymousResponses: Math.max(
				refreshedResults.summary.anonymousResponses,
				currentResults.summary.anonymousResponses,
			),
			authenticatedResponses: Math.max(
				refreshedResults.summary.authenticatedResponses,
				currentResults.summary.authenticatedResponses,
			),
			lastSubmittedAt: currentResults.summary.lastSubmittedAt,
			activeViewers:
				refreshedResults.summary.activeViewers ??
				currentResults.summary.activeViewers,
			regions:
				refreshedResults.summary.regions ??
				currentResults.summary.regions,
		},
		questions: currentResults.questions,
		recentResponses: currentResults.recentResponses,
	};
}

function useEChart(option: EChartsOption) {
	const chartRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!chartRef.current) return;

		const chart = echarts.init(chartRef.current);
		chart.setOption(option);

		const handleResize = () => chart.resize();
		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
			chart.dispose();
		};
	}, [option]);

	return chartRef;
}

function useThemeColors() {
	const { appearance } = useWorkspacePreferences();
	const [colors, setColors] = useState({
		primary: "#316342",
		secondary: "#4c644e",
		error: "#ba1a1a",
	});

	useEffect(() => {
		const updateColors = () => {
			const computed = getComputedStyle(document.documentElement);
			setColors({
				primary:
					computed.getPropertyValue("--color-primary").trim() ||
					"#316342",
				secondary:
					computed.getPropertyValue("--color-secondary").trim() ||
					"#4c644e",
				error:
					computed.getPropertyValue("--color-error").trim() ||
					"#ba1a1a",
			});
		};

		updateColors();
		const timer = window.setTimeout(updateColors, 50);

		let unsubscribe: (() => void) | undefined;
		if (appearance.themeMode === "system") {
			unsubscribe = subscribeToSystemTheme(updateColors);
		}

		return () => {
			window.clearTimeout(timer);
			if (unsubscribe) unsubscribe();
		};
	}, [appearance.themeMode]);

	return colors;
}

export default function Results() {
	const toast = useToast();
	const [polls, setPolls] = useState<Poll[]>([]);
	const [selectedPollId, setSelectedPollId] = useState<string | null>(
		getInitialPollId,
	);
	const [results, setResults] = useState<PollResults | null>(null);
	const [isLoadingPolls, setIsLoadingPolls] = useState(true);
	const [isLoadingResults, setIsLoadingResults] = useState(false);
	const [livePulse, setLivePulse] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const resultReadyPolls = useMemo(
		() => polls.filter((poll) => poll.status !== "draft"),
		[polls],
	);
	const visiblePolls = resultReadyPolls.length > 0 ? resultReadyPolls : polls;

	useEffect(() => {
		void (async () => {
			await Promise.resolve();
			setIsLoadingPolls(true);
			setError(null);

			try {
				const loadedPolls = await pollService.getAllPolls();
				setPolls(loadedPolls);

				const initialPollId = getInitialPollId();
				const fallbackPoll =
					loadedPolls.find((poll) => poll.id === initialPollId) ??
					loadedPolls.find((poll) => poll.status !== "draft") ??
					loadedPolls[0] ??
					null;

				setSelectedPollId(fallbackPoll?.id ?? null);
			} catch (loadError) {
				console.error("Unable to load polls for results:", loadError);
				const message = getApiErrorMessage(
					loadError,
					"Unable to load results.",
				);
				setError(message);
				toast.error(message);
			} finally {
				setIsLoadingPolls(false);
			}
		})();
	}, [toast]);

	useEffect(() => {
		if (!selectedPollId) {
			return;
		}

		void (async () => {
			await Promise.resolve();
			setIsLoadingResults(true);
			setError(null);

			try {
				const nextResults =
					await pollService.getPollResults(selectedPollId);
				setResults(nextResults);
				window.history.replaceState(
					null,
					"",
					`/results?pollId=${selectedPollId}`,
				);
			} catch (loadError) {
				console.error("Unable to load poll results:", loadError);
				const message = getApiErrorMessage(
					loadError,
					"Unable to load poll results.",
				);
				setError(message);
				setResults(null);
				toast.error(message);
			} finally {
				setIsLoadingResults(false);
			}
		})();
	}, [selectedPollId, toast]);

	useEffect(() => {
		if (!selectedPollId) return;

		const socket = createPollSocket();

		const joinSelectedPoll = () => joinPollRoom(socket, selectedPollId);

		socket.on("connect", joinSelectedPoll);
		joinSelectedPoll();

		socket.on("poll:vote", (event: PollVoteEvent) => {
			if (event.pollId !== selectedPollId) return;

			setLivePulse(true);
			window.setTimeout(() => setLivePulse(false), 1400);
			setResults((currentResults) =>
				currentResults
					? applyLiveVote(currentResults, event)
					: currentResults,
			);
			window.setTimeout(() => {
				void pollService
					.getPollResults(selectedPollId)
					.then((refreshedResults) => {
						setResults((currentResults) =>
							preserveLiveResults(
								currentResults,
								refreshedResults,
							),
						);
					})
					.catch((loadError) => {
						console.error(
							"Unable to refresh live results:",
							loadError,
						);
						toast.error(
							getApiErrorMessage(
								loadError,
								"Unable to refresh live results.",
							),
						);
					});
			}, 1800);
		});

		socket.on("poll:analytics", (event: PollAnalyticsEvent) => {
			if (event.pollId !== selectedPollId) return;

			setResults((currentResults) =>
				currentResults
					? {
							...currentResults,
							summary: {
								...currentResults.summary,
								activeViewers:
									event.activeViewers ??
									currentResults.summary.activeViewers ??
									0,
								regions:
									event.regions ??
									currentResults.summary.regions,
								totalResponses:
									event.totalVotes === undefined
										? currentResults.summary.totalResponses
										: Math.max(
												currentResults.summary
													.totalResponses,
												event.totalVotes,
											),
							},
						}
					: currentResults,
			);
		});

		return () => {
			leavePollRoom(socket, selectedPollId);
			socket.disconnect();
		};
	}, [selectedPollId, toast]);

	const publicLink = results ? getPollLink(results.poll) : null;
	const responseRate =
		results && results.questions.length > 0
			? Math.round(
					results.questions.reduce(
						(total, question) => total + question.responseCount,
						0,
					) / results.questions.length,
				)
			: 0;

	const exportResults = () => {
		if (!results) return;

		const blob = new Blob([JSON.stringify(results, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `${results.poll.publicSlug || results.poll.id}-results.json`;
		link.click();
		URL.revokeObjectURL(url);
		toast.success("Results exported.");
	};

	if (isLoadingPolls) {
		return (
			<section className="space-y-gutter pb-32 md:pb-0">
				<header className="flex flex-col justify-between gap-lg border-b border-outline-variant pb-lg lg:flex-row lg:items-end">
					<div className="space-y-sm flex-grow">
						<div className="flex flex-wrap items-center gap-sm">
							<Skeleton className="h-6 w-20 rounded" />
							<Skeleton className="h-6 w-40 rounded" />
						</div>
						<Skeleton className="h-10 w-2/3 mt-2" />
						<Skeleton className="h-4 w-1/2 mt-2" />
					</div>
					<div className="flex flex-col gap-sm">
						<div className="h-16 w-80 rounded-xl border border-outline-variant bg-surface-container-low" />
						<div className="flex gap-sm">
							<Skeleton className="h-10 w-40 rounded-lg" />
							<Skeleton className="h-10 w-24 rounded-full" />
						</div>
					</div>
				</header>
				<div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
					<div className="space-y-md rounded-xl border border-outline-variant bg-surface-container p-md lg:col-span-7">
						<div className="flex items-center justify-between border-b border-outline-variant pb-sm">
							<div className="space-y-xs">
								<Skeleton className="h-6 w-48" />
								<Skeleton className="h-4 w-32" />
							</div>
							<div className="space-y-xs text-right">
								<Skeleton className="h-3 w-16 ml-auto" />
								<Skeleton className="h-5 w-24 ml-auto" />
							</div>
						</div>
						<Skeleton className="h-48 w-full rounded-lg" />
					</div>
					<div className="flex flex-col gap-gutter lg:col-span-5">
						<div className="flex-grow rounded-xl border border-outline-variant bg-surface-container-high p-lg space-y-md">
							<div className="flex justify-between">
								<div className="space-y-xs">
									<Skeleton className="h-3 w-24" />
									<Skeleton className="h-8 w-12" />
								</div>
								<Skeleton className="h-6 w-6" />
							</div>
							<div className="flex h-12 items-end gap-1">
								{[...Array(7)].map((_, i) => (
									<Skeleton key={i} className="w-full bg-surface-container-highest" style={{ height: `${20 + i * 10}%` }} />
								))}
							</div>
						</div>
					</div>
				</div>
			</section>
		);
	}

	if (polls.length === 0) {
		return (
			<section className="rounded-xl border border-outline-variant bg-surface-container p-xl text-center">
				<span className="material-symbols-outlined mb-md text-[40px] text-primary">
					analytics
				</span>
				<h2 className="mb-sm font-serif text-headline-md text-primary">
					No polls yet
				</h2>
				<p className="font-sans text-on-surface-variant">
					Create and publish a poll before reviewing results.
				</p>
			</section>
		);
	}

	const completionPercent =
		results && results.questions.length > 0
			? Math.round(
					(results.questions.filter(
						(question) => question.responseCount > 0,
					).length /
						results.questions.length) *
						100,
				)
			: 0;

	return (
		<section className="space-y-gutter pb-32 md:pb-0">
			<header className="flex flex-col justify-between gap-lg border-b border-outline-variant pb-lg lg:flex-row lg:items-end">
				<div className="space-y-sm">
					<div className="flex flex-wrap items-center gap-sm">
						<span
							className={`flex items-center gap-xs rounded px-2 py-0.5 font-sans text-label-md ${
								results?.poll.status === "active"
									? "animate-pulse border border-error/20 bg-error/10 text-error"
									: results
										? getStatusClass(results.poll.status)
										: getStatusClass("draft")
							}`}>
							{results?.poll.status === "active" ? (
								<span className="h-2 w-2 rounded-full bg-error" />
							) : null}
							{results?.poll.status ?? "loading"}
						</span>
						{results ? (
							<span className="flex items-center gap-xs rounded border border-outline-variant bg-surface-container-high px-2 py-0.5 font-sans text-label-md text-on-surface-variant">
								<span className="material-symbols-outlined text-[16px]">
									schedule
								</span>
								Time Remaining:{" "}
								{getTimeRemaining(results.poll.expiresAt)}
							</span>
						) : null}
						{livePulse ? (
							<span className="rounded bg-primary-fixed px-2 py-0.5 font-sans text-label-md text-on-primary-fixed">
								Live update
							</span>
						) : null}
					</div>
					<h2 className="font-serif text-headline-md text-primary">
						{results?.poll.title ?? "Poll results"}
					</h2>
					<p className="max-w-3xl font-sans text-on-surface-variant">
						{results?.poll.description ||
							"Review response totals, answer distribution, and the latest submissions."}
					</p>
				</div>

				<div className="flex flex-col gap-sm">
					{results ? (
						<div className="grid grid-cols-2 items-center gap-md rounded-xl border border-outline-variant bg-surface-container-low px-lg py-md md:flex">
							<div className="px-4">
								<p className="font-sans text-label-md uppercase text-on-surface-variant">
									Total Participants
								</p>
								<p className="font-serif text-2xl font-bold text-primary md:text-3xl">
									{results.summary.totalResponses}
								</p>
							</div>
							<div className="hidden h-10 w-px bg-outline-variant md:block" />
							<div className="px-4">
								<p className="font-sans text-label-md uppercase text-on-surface-variant">
									Response Count
								</p>
								<p className="font-serif text-2xl font-bold text-primary md:text-3xl">
									{results.summary.totalAnswerSelections}
								</p>
							</div>
							<div className="hidden h-10 w-px bg-outline-variant md:block" />
							<div className="px-4">
								<p className="font-sans text-label-md uppercase text-on-surface-variant">
									Live Viewers
								</p>
								<p className="font-serif text-2xl font-bold text-primary md:text-3xl">
									{results.summary.activeViewers ?? 0}
								</p>
							</div>
						</div>
					) : null}
					<div className="flex flex-col gap-sm md:flex-row md:items-center">
						<select
							className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm font-sans text-primary"
							onChange={(event) =>
								setSelectedPollId(event.target.value)
							}
							value={selectedPollId ?? ""}>
							{visiblePolls.map((poll) => (
								<option
									key={poll.id}
									value={poll.id}>
									{poll.title}
								</option>
							))}
						</select>
						<button
							className="flex items-center justify-center gap-xs rounded-full bg-primary-container px-lg py-sm font-sans text-on-primary-container disabled:cursor-not-allowed disabled:opacity-60"
							disabled={!results}
							onClick={exportResults}
							type="button">
							<span className="material-symbols-outlined text-[18px]">
								download
							</span>
							Export
						</button>
					</div>
				</div>
			</header>

			{error ? (
				<p className="rounded-md bg-error-container px-md py-sm font-sans text-on-error-container">
					{error}
				</p>
			) : null}

			{isLoadingResults || !results ? (
				<div className="space-y-gutter">
					<div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
						<div className="space-y-md rounded-xl border border-outline-variant bg-surface-container p-md lg:col-span-7">
							<div className="flex items-center justify-between border-b border-outline-variant pb-sm">
								<div className="space-y-xs">
									<Skeleton className="h-6 w-48" />
									<Skeleton className="h-4 w-32" />
								</div>
								<div className="space-y-xs text-right">
									<Skeleton className="h-3 w-16 ml-auto" />
									<Skeleton className="h-5 w-24 ml-auto" />
								</div>
							</div>
							<Skeleton className="h-48 w-full rounded-lg" />
						</div>
						<div className="flex flex-col gap-gutter lg:col-span-5">
							<div className="flex-grow rounded-xl border border-outline-variant bg-surface-container-high p-lg space-y-md">
								<div className="flex justify-between">
									<div className="space-y-xs">
										<Skeleton className="h-3 w-24" />
										<Skeleton className="h-8 w-12" />
									</div>
									<Skeleton className="h-6 w-6" />
								</div>
								<div className="flex h-12 items-end gap-1">
									{[...Array(7)].map((_, i) => (
										<Skeleton key={i} className="w-full bg-surface-container-highest" style={{ height: `${20 + i * 10}%` }} />
									))}
								</div>
							</div>
							<div className="flex gap-gutter">
								<div className="flex-1 rounded-xl border border-outline-variant bg-surface-container-high p-4 space-y-xs">
									<Skeleton className="h-3 w-12" />
									<Skeleton className="h-8 w-16" />
									<Skeleton className="h-1.5 w-full rounded-full" />
								</div>
								<div className="flex-1 rounded-xl border border-outline-variant bg-surface-container-high p-4 space-y-xs">
									<Skeleton className="h-3 w-16" />
									<Skeleton className="h-8 w-10" />
									<Skeleton className="h-3 w-20" />
								</div>
							</div>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
						<div className="rounded-xl border border-outline-variant bg-surface-container p-lg space-y-md">
							<Skeleton className="h-6 w-40" />
							<Skeleton className="h-48 w-full rounded-lg" />
						</div>
						<div className="rounded-xl border border-outline-variant bg-surface-container p-lg space-y-md">
							<Skeleton className="h-6 w-40" />
							<Skeleton className="h-48 w-full rounded-lg" />
						</div>
					</div>
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
						<ActivityInsights results={results} />
						<VelocityPanel
							completionPercent={completionPercent}
							responseRate={responseRate}
							results={results}
						/>
					</div>

					<div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
						<AudienceOriginPanel results={results} />
						<AudienceSegmentsPanel results={results} />
					</div>

					<div className="grid grid-cols-1 gap-gutter lg:grid-cols-[minmax(0,1fr)_22rem]">
						<section className="space-y-lg">
							<div className="flex items-center justify-between gap-md">
								<h3 className="font-serif text-title-lg text-primary">
									Question summaries
								</h3>
								<span className="font-sans text-label-md text-on-surface-variant">
									{results.questions.length} question
									{results.questions.length === 1 ? "" : "s"}
								</span>
							</div>

							{results.questions.length === 0 ? (
								<p className="rounded-xl border border-outline-variant bg-surface-container p-lg font-sans text-on-surface-variant">
									This poll has no questions yet.
								</p>
							) : (
								<div className="grid grid-cols-1 gap-gutter">
									{results.questions.map(
										(question, questionIndex) => (
											<QuestionResultCard
												key={question.id}
												question={question}
												questionIndex={questionIndex}
											/>
										),
									)}
								</div>
							)}
						</section>

						<aside className="space-y-gutter">
							<section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
								<h3 className="mb-md font-serif text-title-lg text-primary">
									Distribution
								</h3>
								<div className="space-y-md">
									<SplitBar
										label="Anonymous"
										total={results.summary.totalResponses}
										value={
											results.summary.anonymousResponses
										}
									/>
									<SplitBar
										label="Authenticated"
										total={results.summary.totalResponses}
										value={
											results.summary
												.authenticatedResponses
										}
									/>
								</div>
								{publicLink ? (
									<a
										className="mt-lg flex items-center gap-xs font-sans text-primary hover:underline"
										href={publicLink}
										rel="noreferrer"
										target="_blank">
										<span className="material-symbols-outlined text-[18px]">
											open_in_new
										</span>
										Open public poll
									</a>
								) : null}
							</section>

							<section className="rounded-xl border border-outline-variant bg-surface-container p-lg">
								<h3 className="mb-md font-serif text-title-lg text-primary">
									Recent submissions
								</h3>
								{results.recentResponses.length === 0 ? (
									<p className="font-sans text-on-surface-variant">
										No responses have arrived yet.
									</p>
								) : (
									<div className="space-y-sm">
										{results.recentResponses.map(
											(response) => (
												<div
													className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md"
													key={response.id}>
													<div className="flex items-center justify-between gap-md">
														<span className="font-sans text-on-surface">
															{formatDateTime(
																response.submittedAt,
															)}
														</span>
														<span className="rounded-full bg-secondary-container px-2 py-0.5 font-sans text-label-md text-on-secondary-container">
															{response.status}
														</span>
													</div>
													<p className="mt-xs font-sans text-label-md text-on-surface-variant">
														{response.isAnonymous
															? "Anonymous"
															: "Authenticated"}{" "}
														response,{" "}
														{response.answerCount}{" "}
														answer
														{response.answerCount ===
														1
															? ""
															: "s"}
													</p>
												</div>
											),
										)}
									</div>
								)}
							</section>
						</aside>
					</div>

					<SubmissionLog
						onExport={exportResults}
						responses={results.recentResponses}
					/>
				</>
			)}
		</section>
	);
}

function ActivityInsights({ results }: { results: PollResults }) {
	const colors = useThemeColors();
	const chartOption = useMemo<EChartsOption>(
		() => ({
			color: [colors.primary, colors.error],
			grid: { bottom: 24, left: 32, right: 12, top: 20 },
			tooltip: { trigger: "axis" },
			xAxis: {
				type: "category",
				boundaryGap: false,
				data: ["Start", "25%", "50%", "75%", "Now"],
			},
			yAxis: { type: "value", minInterval: 1 },
			series: [
				{
					type: "line",
					smooth: true,
					areaStyle: { opacity: 0.12 },
					data: [
						0,
						Math.max(
							0,
							Math.round(results.summary.totalResponses * 0.2),
						),
						Math.max(
							0,
							Math.round(results.summary.totalResponses * 0.45),
						),
						Math.max(
							0,
							Math.round(results.summary.totalResponses * 0.7),
						),
						results.summary.totalResponses,
					],
				},
			],
		}),
		[results.summary.totalResponses],
	);
	const chartRef = useEChart(chartOption);

	return (
		<div className="space-y-md rounded-xl border border-outline-variant bg-surface-container p-md lg:col-span-7">
			<div className="flex items-center justify-between border-b border-outline-variant pb-sm">
				<div>
					<h3 className="font-serif text-title-lg">
						Participation Insights
					</h3>
					<p className="font-sans text-on-surface-variant">
						Active engagement trends
					</p>
				</div>
				<div className="text-right">
					<p className="font-sans text-[10px] uppercase text-on-surface-variant">
						Latest Activity
					</p>
					<p className="font-serif font-bold text-primary">
						{formatDateTime(results.summary.lastSubmittedAt)}
					</p>
				</div>
			</div>
			<div
				className="h-48 w-full rounded-lg bg-surface-container-low"
				ref={chartRef}
			/>
		</div>
	);
}

function VelocityPanel({
	completionPercent,
	responseRate,
	results,
}: {
	completionPercent: number;
	responseRate: number;
	results: PollResults;
}) {
	const bars = [
		20,
		35,
		30,
		55,
		45,
		80,
		results.summary.totalResponses > 0 ? 100 : 12,
	];

	return (
		<div className="flex flex-col gap-gutter lg:col-span-5">
			<div className="flex-1 rounded-xl border border-outline-variant bg-surface-container-high p-lg">
				<div className="mb-4 flex items-start justify-between">
					<div>
						<p className="font-sans text-[10px] uppercase text-on-surface-variant">
							Response Velocity
						</p>
						<h4 className="font-serif text-2xl font-bold text-primary">
							{results.summary.totalResponses}
						</h4>
					</div>
					<span className="material-symbols-outlined text-primary">
						trending_up
					</span>
				</div>
				<div className="flex h-12 items-end gap-1">
					{bars.map((height, index) => (
						<div
							className={`w-full rounded-t-sm ${
								index === bars.length - 1
									? "animate-pulse bg-primary"
									: "bg-primary/40"
							}`}
							key={`${height}-${index}`}
							style={{ height: `${height}%` }}
						/>
					))}
				</div>
				<p className="mt-2 text-center text-[10px] text-on-surface-variant">
					Submissions / latest window
				</p>
			</div>
			<div className="flex flex-1 gap-gutter">
				<div className="flex flex-1 flex-col justify-center rounded-xl border border-outline-variant/20 bg-secondary-container p-4 text-on-secondary-container">
					<p className="mb-1 font-sans text-[10px] uppercase">
						Completion
					</p>
					<h4 className="font-serif text-2xl font-bold">
						{completionPercent}%
					</h4>
					<div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-on-secondary-container/20">
						<div
							className="h-full bg-on-secondary-container"
							style={{ width: `${completionPercent}%` }}
						/>
					</div>
				</div>
				<div className="flex flex-1 flex-col justify-center rounded-xl border border-outline-variant bg-surface-container-high p-4">
					<p className="mb-1 font-sans text-[10px] uppercase text-on-surface-variant">
						Avg. Reach
					</p>
					<h4 className="font-serif text-2xl font-bold text-on-surface">
						{responseRate}
					</h4>
					<p className="mt-1 flex items-center gap-1 text-[9px] text-on-surface-variant">
						<span className="material-symbols-outlined text-[10px]">
							timer
						</span>
						per question
					</p>
				</div>
			</div>
		</div>
	);
}

function AudienceOriginPanel({ results }: { results: PollResults }) {
	const regions = useMemo(
		() => aggregateAudienceRegions(results.summary.regions, 6),
		[results.summary.regions],
	);
	const totalRegions = regions.reduce(
		(total, region) => total + region.count,
		0,
	);
	const colors = useThemeColors();
	const chartOption = useMemo<EChartsOption>(
		() => ({
			color: [colors.primary],
			grid: { bottom: 24, left: 28, right: 8, top: 12 },
			tooltip: { trigger: "axis" },
			xAxis: {
				type: "category",
				axisLabel: { interval: 0, overflow: "truncate", width: 72 },
				data: regions.map((region) => region.region),
			},
			yAxis: { type: "value", minInterval: 1 },
			series: [
				{
					type: "bar",
					barMaxWidth: 36,
					data: regions.map((region) => region.count),
				},
			],
		}),
		[regions],
	);
	const chartRef = useEChart(chartOption);

	return (
		<div className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md md:col-span-7">
			<div className="flex items-center justify-between border-b border-outline-variant pb-xs">
				<p className="font-sans text-[10px] uppercase text-on-surface-variant">
					Live Audience Origin
				</p>
				<span className="material-symbols-outlined text-[16px] text-on-surface-variant">
					public
				</span>
			</div>
			<div className="flex flex-col items-center gap-lg ">
				<div className="w-full space-y-4">
					{regions.length === 0 ? (
						<p className="rounded-lg bg-surface-container p-md font-sans text-on-surface-variant">
							Waiting for live viewers to join this poll.
						</p>
					) : (
						regions.map((region) => (
							<SplitBar
								key={region.region}
								label={region.region}
								total={totalRegions}
								value={region.count}
							/>
						))
					)}
				</div>
				<div className="flex min-h-[120px] w-full items-center justify-center rounded-lg bg-surface-container p-2 ">
					<div
						className="h-40 w-full"
						ref={chartRef}
					/>
				</div>
			</div>
		</div>
	);
}

function AudienceSegmentsPanel({ results }: { results: PollResults }) {
	const colors = useThemeColors();
	const chartOption = useMemo<EChartsOption>(
		() => ({
			color: [colors.primary, colors.secondary, colors.error],
			legend: { bottom: 0 },
			tooltip: { trigger: "item" },
			series: [
				{
					type: "pie",
					radius: ["48%", "72%"],
					center: ["50%", "42%"],
					data: [
						{
							name: "Anonymous",
							value: results.summary.anonymousResponses,
						},
						{
							name: "Authenticated",
							value: results.summary.authenticatedResponses,
						},
					],
					label: { formatter: "{b}: {c}" },
				},
			],
		}),
		[
			results.summary.anonymousResponses,
			results.summary.authenticatedResponses,
		],
	);
	const chartRef = useEChart(chartOption);

	return (
		<div className="space-y-md rounded-xl border border-outline-variant bg-surface-container p-md md:col-span-5">
			<div className="flex items-center justify-between border-b border-outline-variant pb-xs">
				<p className="font-sans text-[10px] uppercase text-on-surface-variant">
					Audience Segments
				</p>
				<span className="material-symbols-outlined text-[16px] text-on-surface-variant">
					groups
				</span>
			</div>
			<div
				className="h-44 w-full"
				ref={chartRef}
			/>
			<div className="space-y-3">
				<SplitBar
					label="Anonymous"
					total={results.summary.totalResponses}
					value={results.summary.anonymousResponses}
				/>
				<SplitBar
					label="Authenticated"
					total={results.summary.totalResponses}
					value={results.summary.authenticatedResponses}
				/>
				<div className="border-t border-outline-variant pt-2">
					<p className="mb-2 font-sans text-[11px] text-on-surface-variant">
						Response Mode
					</p>
					<div className="flex gap-2">
						<div className="flex-1 rounded border border-outline-variant/50 bg-surface-container-high p-2 text-center">
							<p className="font-sans font-bold text-primary">
								{results.poll.responseMode === "authenticated"
									? "Verified"
									: "Open"}
							</p>
							<p className="text-[9px] uppercase text-on-surface-variant">
								Mode
							</p>
						</div>
						<div className="flex-1 rounded border border-outline-variant/50 bg-surface-container-high p-2 text-center">
							<p className="font-sans font-bold text-primary">
								{results.questions.length}
							</p>
							<p className="text-[9px] uppercase text-on-surface-variant">
								Questions
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function QuestionResultCard({
	question,
	questionIndex,
}: {
	question: PollResults["questions"][number];
	questionIndex: number;
}) {
	const colors = useThemeColors();
	const chartOption = useMemo<EChartsOption>(
		() => ({
			color: [colors.primary],
			grid: { bottom: 24, left: 32, right: 12, top: 8 },
			tooltip: { trigger: "axis" },
			xAxis: {
				type: "category",
				axisLabel: { interval: 0, overflow: "truncate", width: 90 },
				data: question.options.map((option) => option.optionText),
			},
			yAxis: { type: "value", minInterval: 1 },
			series: [
				{
					type: "bar",
					barMaxWidth: 42,
					data: question.options.map(
						(option) => option.selectionCount,
					),
				},
			],
		}),
		[question.options],
	);
	const chartRef = useEChart(chartOption);

	return (
		<article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
			<div className="mb-lg flex flex-col justify-between gap-md md:flex-row md:items-start">
				<div>
					<div className="mb-sm flex flex-wrap items-center gap-xs">
						<span className="rounded-full bg-secondary-container px-3 py-1 font-sans text-label-md text-on-secondary-container">
							Question {questionIndex + 1}
						</span>
						<span className="rounded-full bg-surface-container-high px-3 py-1 font-sans text-label-md text-on-surface-variant">
							{question.questionType === "multiple_choice"
								? "Multiple choice"
								: "Single choice"}
						</span>
						{question.isRequired ? (
							<span className="rounded-full bg-primary-container px-3 py-1 font-sans text-label-md text-on-primary-container">
								Required
							</span>
						) : null}
					</div>
					<h4 className="font-serif text-title-lg text-on-surface">
						{question.questionText}
					</h4>
				</div>
				<div className="rounded-lg bg-surface-container-low px-md py-sm text-right">
					<p className="font-sans text-label-md text-on-surface-variant">
						Responses
					</p>
					<p className="font-serif text-title-lg text-primary">
						{question.responseCount}
					</p>
				</div>
			</div>

			<div
				className="mb-lg h-56 w-full rounded-lg bg-surface-container-low"
				ref={chartRef}
			/>

			<div className="space-y-md">
				{question.options.map((option) => (
					<div
						className="space-y-xs"
						key={option.id}>
						<div className="flex items-center justify-between gap-md font-sans text-label-lg">
							<span className="min-w-0 break-words text-on-surface">
								{option.optionText}
							</span>
							<span className="shrink-0 text-primary">
								{option.selectionCount} ({option.percentage}%)
							</span>
						</div>
						<div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
							<div
								className="h-full rounded-full bg-primary-container"
								style={{ width: `${option.percentage}%` }}
							/>
						</div>
					</div>
				))}
			</div>
		</article>
	);
}

function SubmissionLog({
	responses,
	onExport,
}: {
	responses: PollResults["recentResponses"];
	onExport: () => void;
}) {
	return (
		<section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
			<div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-md py-lg">
				<div>
					<h3 className="font-serif text-title-lg">
						Verified Submission Log
					</h3>
					<p className="font-sans text-label-md text-on-surface-variant">
						Real-time curation feed
					</p>
				</div>
				<button
					className="flex items-center gap-2 rounded-full bg-primary px-lg py-sm font-sans text-xs text-on-primary transition-all hover:opacity-90"
					onClick={onExport}
					type="button">
					<span className="material-symbols-outlined text-[18px]">
						download
					</span>
					Export
				</button>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full border-collapse text-left">
					<thead>
						<tr className="border-b border-outline-variant bg-surface-container-high">
							<th className="px-md py-sm font-sans text-on-surface-variant">
								Time
							</th>
							<th className="px-md py-sm font-sans text-on-surface-variant">
								Segment
							</th>
							<th className="px-md py-sm font-sans text-on-surface-variant">
								Response
							</th>
							<th className="px-md py-sm font-sans text-on-surface-variant">
								Status
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-outline-variant">
						{responses.length === 0 ? (
							<tr>
								<td
									className="px-md py-md font-sans text-on-surface-variant"
									colSpan={4}>
									No submissions yet.
								</td>
							</tr>
						) : (
							responses.map((response) => (
								<tr
									className="transition-colors hover:bg-surface-container-low"
									key={response.id}>
									<td className="whitespace-nowrap px-md py-md font-sans text-xs text-on-surface-variant">
										{formatDateTime(response.submittedAt)}
									</td>
									<td className="px-md py-md">
										<span className="rounded-full bg-outline-variant/30 px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
											{response.isAnonymous
												? "Anonymous"
												: "Verified"}
										</span>
									</td>
									<td className="px-md py-md font-sans text-xs italic text-on-surface">
										{response.answerCount} answer
										{response.answerCount === 1
											? ""
											: "s"}{" "}
										recorded
									</td>
									<td className="px-md py-md">
										<span className="rounded-full bg-secondary-container px-2 py-1 text-[9px] font-bold uppercase text-on-secondary-container">
											{response.status}
										</span>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</section>
	);
}

function SplitBar({
	label,
	total,
	value,
}: {
	label: string;
	total: number;
	value: number;
}) {
	const percentage = total === 0 ? 0 : Math.round((value / total) * 100);

	return (
		<div className="space-y-xs">
			<div className="flex items-center justify-between gap-md font-sans text-label-lg">
				<span>{label}</span>
				<span className="text-primary">
					{value} ({percentage}%)
				</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
				<div
					className="h-full rounded-full bg-secondary-container"
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	);
}
