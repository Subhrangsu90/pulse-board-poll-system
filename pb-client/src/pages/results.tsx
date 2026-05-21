import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useToast } from "../components/toastContext";
import { API_BASE_URL, getApiErrorMessage } from "../services/api/apiService";
import { pollService, type Poll, type PollResults } from "../services/api/pollService";

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

function getSocketUrl() {
	if (API_BASE_URL.startsWith("http")) {
		const url = new URL(API_BASE_URL);
		return url.origin;
	}

	return window.location.origin;
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
	if (status === "active") return "bg-primary-container text-on-primary-container";
	if (status === "completed") return "bg-secondary-container text-on-secondary-container";
	if (status === "expired") return "bg-error-container text-on-error-container";
	return "bg-surface-container-high text-on-surface-variant";
}

export default function Results() {
	const toast = useToast();
	const [polls, setPolls] = useState<Poll[]>([]);
	const [selectedPollId, setSelectedPollId] = useState<string | null>(getInitialPollId);
	const [results, setResults] = useState<PollResults | null>(null);
	const [isLoadingPolls, setIsLoadingPolls] = useState(true);
	const [isLoadingResults, setIsLoadingResults] = useState(false);
	const [livePulse, setLivePulse] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const resultReadyPolls = useMemo(
		() => polls.filter((poll) => poll.status !== "draft"),
		[polls]
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
				const message = getApiErrorMessage(loadError, "Unable to load results.");
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
				const nextResults = await pollService.getPollResults(selectedPollId);
				setResults(nextResults);
				window.history.replaceState(null, "", `/results?pollId=${selectedPollId}`);
			} catch (loadError) {
				console.error("Unable to load poll results:", loadError);
				const message = getApiErrorMessage(loadError, "Unable to load poll results.");
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

		const socket = io(getSocketUrl(), {
			withCredentials: true,
		});

		socket.emit("poll:results:join", selectedPollId);
		socket.on("poll:results:update", (event: { pollId?: string }) => {
			if (event.pollId !== selectedPollId) return;

			setLivePulse(true);
			window.setTimeout(() => setLivePulse(false), 1400);
			void pollService
				.getPollResults(selectedPollId)
				.then(setResults)
				.catch((loadError) => {
					console.error("Unable to refresh live results:", loadError);
					toast.error(getApiErrorMessage(loadError, "Unable to refresh live results."));
				});
		});

		return () => {
			socket.emit("poll:results:leave", selectedPollId);
			socket.disconnect();
		};
	}, [selectedPollId, toast]);

	const publicLink = results ? getPollLink(results.poll) : null;
	const responseRate =
		results && results.questions.length > 0
			? Math.round(
					results.questions.reduce((total, question) => total + question.responseCount, 0) /
						results.questions.length
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
			<section className="rounded-xl border border-outline-variant bg-surface-container p-xl">
				<p className="font-body-md text-on-surface-variant">Loading results...</p>
			</section>
		);
	}

	if (polls.length === 0) {
		return (
			<section className="rounded-xl border border-outline-variant bg-surface-container p-xl text-center">
				<span className="material-symbols-outlined mb-md text-[40px] text-primary">
					analytics
				</span>
				<h2 className="mb-sm font-serif text-headline-md text-primary">No polls yet</h2>
				<p className="font-body-md text-on-surface-variant">
					Create and publish a poll before reviewing results.
				</p>
			</section>
		);
	}

	const completionPercent =
		results && results.questions.length > 0
			? Math.round(
					(results.questions.filter((question) => question.responseCount > 0).length /
						results.questions.length) *
						100
				)
			: 0;

	return (
		<section className="space-y-gutter pb-32 md:pb-0">
			<header className="flex flex-col justify-between gap-lg border-b border-outline-variant pb-lg lg:flex-row lg:items-end">
				<div className="space-y-sm">
					<div className="flex flex-wrap items-center gap-sm">
						<span
							className={`flex items-center gap-xs rounded px-2 py-0.5 font-label-md text-label-md ${
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
							<span className="flex items-center gap-xs rounded border border-outline-variant bg-surface-container-high px-2 py-0.5 font-label-md text-label-md text-on-surface-variant">
								<span className="material-symbols-outlined text-[16px]">schedule</span>
								Time Remaining: {getTimeRemaining(results.poll.expiresAt)}
							</span>
						) : null}
						{livePulse ? (
							<span className="rounded bg-primary-fixed px-2 py-0.5 font-label-md text-label-md text-on-primary-fixed">
								Live update
							</span>
						) : null}
					</div>
					<h2 className="font-serif text-headline-md text-primary">
						{results?.poll.title ?? "Poll results"}
					</h2>
					<p className="max-w-3xl font-body-md text-on-surface-variant">
						{results?.poll.description ||
							"Review response totals, answer distribution, and the latest submissions."}
					</p>
				</div>

				<div className="flex flex-col gap-sm">
					{results ? (
						<div className="grid grid-cols-2 items-center gap-md rounded-xl border border-outline-variant bg-surface-container-low px-lg py-md md:flex">
							<div className="px-4">
								<p className="font-label-md text-label-md uppercase text-on-surface-variant">
									Total Participants
								</p>
								<p className="font-display-lg text-2xl font-bold text-primary md:text-3xl">
									{results.summary.totalResponses}
								</p>
							</div>
							<div className="hidden h-10 w-px bg-outline-variant md:block" />
							<div className="px-4">
								<p className="font-label-md text-label-md uppercase text-on-surface-variant">
									Response Count
								</p>
								<p className="font-display-lg text-2xl font-bold text-primary md:text-3xl">
									{results.summary.totalAnswerSelections}
								</p>
							</div>
						</div>
					) : null}
					<div className="flex flex-col gap-sm md:flex-row md:items-center">
					<select
						className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm font-label-lg text-primary"
						onChange={(event) => setSelectedPollId(event.target.value)}
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
						className="flex items-center justify-center gap-xs rounded-full bg-primary-container px-lg py-sm font-label-lg text-on-primary-container disabled:cursor-not-allowed disabled:opacity-60"
						disabled={!results}
						onClick={exportResults}
						type="button">
						<span className="material-symbols-outlined text-[18px]">download</span>
						Export
					</button>
					</div>
				</div>
			</header>

			{error ? (
				<p className="rounded-md bg-error-container px-md py-sm font-body-md text-on-error-container">
					{error}
				</p>
			) : null}

			{isLoadingResults || !results ? (
				<section className="rounded-xl border border-outline-variant bg-surface-container p-xl">
					<p className="font-body-md text-on-surface-variant">Loading selected poll...</p>
				</section>
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
						<AudienceOriginPanel />
						<AudienceSegmentsPanel results={results} />
					</div>

					<div className="grid grid-cols-1 gap-gutter lg:grid-cols-[minmax(0,1fr)_22rem]">
						<section className="space-y-lg">
							<div className="flex items-center justify-between gap-md">
								<h3 className="font-serif text-title-lg text-primary">
									Question summaries
								</h3>
								<span className="font-label-md text-label-md text-on-surface-variant">
									{results.questions.length} question
									{results.questions.length === 1 ? "" : "s"}
								</span>
							</div>

							{results.questions.length === 0 ? (
								<p className="rounded-xl border border-outline-variant bg-surface-container p-lg font-body-md text-on-surface-variant">
									This poll has no questions yet.
								</p>
							) : (
								<div className="grid grid-cols-1 gap-gutter">
									{results.questions.map((question, questionIndex) => (
										<QuestionResultCard
											key={question.id}
											question={question}
											questionIndex={questionIndex}
										/>
									))}
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
										value={results.summary.anonymousResponses}
									/>
									<SplitBar
										label="Authenticated"
										total={results.summary.totalResponses}
										value={results.summary.authenticatedResponses}
									/>
								</div>
								{publicLink ? (
									<a
										className="mt-lg flex items-center gap-xs font-label-lg text-primary hover:underline"
										href={publicLink}
										rel="noreferrer"
										target="_blank">
										<span className="material-symbols-outlined text-[18px]">open_in_new</span>
										Open public poll
									</a>
								) : null}
							</section>

							<section className="rounded-xl border border-outline-variant bg-surface-container p-lg">
								<h3 className="mb-md font-serif text-title-lg text-primary">
									Recent submissions
								</h3>
								{results.recentResponses.length === 0 ? (
									<p className="font-body-md text-on-surface-variant">
										No responses have arrived yet.
									</p>
								) : (
									<div className="space-y-sm">
										{results.recentResponses.map((response) => (
											<div
												className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md"
												key={response.id}>
												<div className="flex items-center justify-between gap-md">
													<span className="font-label-lg text-on-surface">
														{formatDateTime(response.submittedAt)}
													</span>
													<span className="rounded-full bg-secondary-container px-2 py-0.5 font-label-md text-label-md text-on-secondary-container">
														{response.status}
													</span>
												</div>
												<p className="mt-xs font-label-md text-label-md text-on-surface-variant">
													{response.isAnonymous ? "Anonymous" : "Authenticated"} response,
													{" "}
													{response.answerCount} answer
													{response.answerCount === 1 ? "" : "s"}
												</p>
											</div>
										))}
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
	const path =
		results.summary.totalResponses === 0
			? "M0 80 Q20 80 40 80 Q60 80 80 80 Q90 80 100 80"
			: "M0 80 Q10 70 20 60 Q30 50 40 70 Q50 90 60 40 Q70 10 80 30 Q90 50 100 10";

	return (
		<div className="space-y-md rounded-xl border border-outline-variant bg-surface-container p-md lg:col-span-7">
			<div className="flex items-center justify-between border-b border-outline-variant pb-sm">
				<div>
					<h3 className="font-serif text-title-lg">Participation Insights</h3>
					<p className="font-label-md text-on-surface-variant">
						Active engagement trends
					</p>
				</div>
				<div className="text-right">
					<p className="font-label-md text-[10px] uppercase text-on-surface-variant">
						Latest Activity
					</p>
					<p className="font-title-lg font-bold text-primary">
						{formatDateTime(results.summary.lastSubmittedAt)}
					</p>
				</div>
			</div>
			<div className="relative h-48 w-full rounded-lg bg-surface-container-low p-4">
				<svg
					className="h-full w-full"
					preserveAspectRatio="none"
					viewBox="0 0 100 100">
					<path
						className="fill-primary/5"
						d={`${path} L100 100 L0 100 Z`}
					/>
					<path
						className="fill-none stroke-primary stroke-2"
						d={path}
					/>
				</svg>
				<div className="absolute inset-x-4 bottom-2 flex justify-between font-label-md text-[10px] text-on-surface-variant">
					<span>00:00</span>
					<span>06:00</span>
					<span>12:00</span>
					<span>18:00</span>
					<span>Now</span>
				</div>
			</div>
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
	const bars = [20, 35, 30, 55, 45, 80, results.summary.totalResponses > 0 ? 100 : 12];

	return (
		<div className="flex flex-col gap-gutter lg:col-span-5">
			<div className="flex-1 rounded-xl border border-outline-variant bg-surface-container-high p-lg">
				<div className="mb-4 flex items-start justify-between">
					<div>
						<p className="font-label-md text-[10px] uppercase text-on-surface-variant">
							Response Velocity
						</p>
						<h4 className="font-headline-md text-2xl font-bold text-primary">
							{results.summary.totalResponses}
						</h4>
					</div>
					<span className="material-symbols-outlined text-primary">trending_up</span>
				</div>
				<div className="flex h-12 items-end gap-1">
					{bars.map((height, index) => (
						<div
							className={`w-full rounded-t-sm ${
								index === bars.length - 1 ? "animate-pulse bg-primary" : "bg-primary/40"
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
					<p className="mb-1 font-label-md text-[10px] uppercase">Completion</p>
					<h4 className="font-display-lg text-2xl font-bold">{completionPercent}%</h4>
					<div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-on-secondary-container/20">
						<div
							className="h-full bg-on-secondary-container"
							style={{ width: `${completionPercent}%` }}
						/>
					</div>
				</div>
				<div className="flex flex-1 flex-col justify-center rounded-xl border border-outline-variant bg-surface-container-high p-4">
					<p className="mb-1 font-label-md text-[10px] uppercase text-on-surface-variant">
						Avg. Reach
					</p>
					<h4 className="font-display-lg text-2xl font-bold text-on-surface">
						{responseRate}
					</h4>
					<p className="mt-1 flex items-center gap-1 text-[9px] text-on-surface-variant">
						<span className="material-symbols-outlined text-[10px]">timer</span>
						per question
					</p>
				</div>
			</div>
		</div>
	);
}

function AudienceOriginPanel() {
	return (
		<div className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md md:col-span-7">
			<div className="flex items-center justify-between border-b border-outline-variant pb-xs">
				<p className="font-label-md text-[10px] uppercase text-on-surface-variant">
					Audience Origin
				</p>
				<span className="material-symbols-outlined text-[16px] text-on-surface-variant">
					public
				</span>
			</div>
			<div className="flex flex-col items-center gap-lg md:flex-row">
				<div className="w-full space-y-4 md:w-1/2">
					<SplitBar
						label="Known regions"
						total={100}
						value={0}
					/>
					<SplitBar
						label="Anonymous traffic"
						total={100}
						value={100}
					/>
				</div>
				<div className="flex min-h-[120px] w-full items-center justify-center rounded-lg bg-surface-container p-2 md:w-1/2">
					<div className="relative flex aspect-video w-full items-center justify-center rounded bg-outline-variant/10 text-[10px] italic text-outline">
						<span className="material-symbols-outlined scale-[3] opacity-20">map</span>
						<div className="absolute inset-0 flex items-center justify-center">
							Regional Density Overlay
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function AudienceSegmentsPanel({ results }: { results: PollResults }) {
	return (
		<div className="space-y-md rounded-xl border border-outline-variant bg-surface-container p-md md:col-span-5">
			<div className="flex items-center justify-between border-b border-outline-variant pb-xs">
				<p className="font-label-md text-[10px] uppercase text-on-surface-variant">
					Audience Segments
				</p>
				<span className="material-symbols-outlined text-[16px] text-on-surface-variant">
					groups
				</span>
			</div>
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
					<p className="mb-2 font-label-md text-[11px] text-on-surface-variant">
						Response Mode
					</p>
					<div className="flex gap-2">
						<div className="flex-1 rounded border border-outline-variant/50 bg-surface-container-high p-2 text-center">
							<p className="font-label-md font-bold text-primary">
								{results.poll.responseMode === "authenticated" ? "Verified" : "Open"}
							</p>
							<p className="text-[9px] uppercase text-on-surface-variant">Mode</p>
						</div>
						<div className="flex-1 rounded border border-outline-variant/50 bg-surface-container-high p-2 text-center">
							<p className="font-label-md font-bold text-primary">
								{results.questions.length}
							</p>
							<p className="text-[9px] uppercase text-on-surface-variant">Questions</p>
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
	return (
		<article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
			<div className="mb-lg flex flex-col justify-between gap-md md:flex-row md:items-start">
				<div>
					<div className="mb-sm flex flex-wrap items-center gap-xs">
						<span className="rounded-full bg-secondary-container px-3 py-1 font-label-md text-label-md text-on-secondary-container">
							Question {questionIndex + 1}
						</span>
						<span className="rounded-full bg-surface-container-high px-3 py-1 font-label-md text-label-md text-on-surface-variant">
							{question.questionType === "multiple_choice"
								? "Multiple choice"
								: "Single choice"}
						</span>
						{question.isRequired ? (
							<span className="rounded-full bg-primary-container px-3 py-1 font-label-md text-label-md text-on-primary-container">
								Required
							</span>
						) : null}
					</div>
					<h4 className="font-title-lg text-title-lg text-on-surface">
						{question.questionText}
					</h4>
				</div>
				<div className="rounded-lg bg-surface-container-low px-md py-sm text-right">
					<p className="font-label-md text-label-md text-on-surface-variant">
						Responses
					</p>
					<p className="font-title-lg text-title-lg text-primary">
						{question.responseCount}
					</p>
				</div>
			</div>

			<div className="space-y-md">
				{question.options.map((option) => (
					<div
						className="space-y-xs"
						key={option.id}>
						<div className="flex items-center justify-between gap-md font-label-lg text-label-lg">
							<span className="min-w-0 break-words text-on-surface">{option.optionText}</span>
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
					<h3 className="font-serif text-title-lg">Verified Submission Log</h3>
					<p className="font-label-md text-label-md text-on-surface-variant">
						Real-time curation feed
					</p>
				</div>
				<button
					className="flex items-center gap-2 rounded-full bg-primary px-lg py-sm font-label-lg text-xs text-on-primary transition-all hover:opacity-90"
					onClick={onExport}
					type="button">
					<span className="material-symbols-outlined text-[18px]">download</span>
					Export
				</button>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full border-collapse text-left">
					<thead>
						<tr className="border-b border-outline-variant bg-surface-container-high">
							<th className="px-md py-sm font-label-lg text-on-surface-variant">
								Time
							</th>
							<th className="px-md py-sm font-label-lg text-on-surface-variant">
								Segment
							</th>
							<th className="px-md py-sm font-label-lg text-on-surface-variant">
								Response
							</th>
							<th className="px-md py-sm font-label-lg text-on-surface-variant">
								Status
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-outline-variant">
						{responses.length === 0 ? (
							<tr>
								<td
									className="px-md py-md font-body-md text-on-surface-variant"
									colSpan={4}>
									No submissions yet.
								</td>
							</tr>
						) : (
							responses.map((response) => (
								<tr
									className="transition-colors hover:bg-surface-container-low"
									key={response.id}>
									<td className="whitespace-nowrap px-md py-md font-body-md text-xs text-on-surface-variant">
										{formatDateTime(response.submittedAt)}
									</td>
									<td className="px-md py-md">
										<span className="rounded-full bg-outline-variant/30 px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
											{response.isAnonymous ? "Anonymous" : "Verified"}
										</span>
									</td>
									<td className="px-md py-md font-body-md text-xs italic text-on-surface">
										{response.answerCount} answer
										{response.answerCount === 1 ? "" : "s"} recorded
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
			<div className="flex items-center justify-between gap-md font-label-lg text-label-lg">
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
