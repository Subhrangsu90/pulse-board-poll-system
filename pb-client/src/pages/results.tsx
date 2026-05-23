import { Skeleton } from "../components/Skeleton";
import { usePollResults } from "../hooks/usePollResults";
import {
	getPollLink,
	getTimeRemaining,
	getStatusClass,
	formatDateTime,
} from "../utils/resultHelpers";
import { ActivityInsights } from "../components/results/ActivityInsights";
import { VelocityPanel } from "../components/results/VelocityPanel";
import { AudienceOriginPanel } from "../components/results/AudienceOriginPanel";
import { AudienceSegmentsPanel } from "../components/results/AudienceSegmentsPanel";
import { QuestionResultCard } from "../components/results/QuestionResultCard";
import { SubmissionLog } from "../components/results/SubmissionLog";
import { SplitBar } from "../components/results/SplitBar";

export default function Results() {
	const {
		polls,
		selectedPollId,
		setSelectedPollId,
		results,
		isLoadingPolls,
		isLoadingResults,
		livePulse,
		error,
		visiblePolls,
		exportResults,
	} = usePollResults();

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
									<Skeleton
										key={i}
										className="w-full bg-surface-container-highest"
										style={{ height: `${20 + i * 10}%` }}
									/>
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
										<Skeleton
											key={i}
											className="w-full bg-surface-container-highest"
											style={{ height: `${20 + i * 10}%` }}
										/>
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
