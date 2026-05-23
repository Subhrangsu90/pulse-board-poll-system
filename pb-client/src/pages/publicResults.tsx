import { useEffect, useState } from "react";
import { AudienceOriginCard } from "../components/AudienceOriginCard";
import { getApiErrorMessage } from "../services/api/apiService";
import { pollService, type PollResults } from "../services/api/pollService";
import {
	createPollSocket,
	joinPollRoom,
	leavePollRoom,
	type PollAnalyticsEvent,
	type PollVoteEvent,
} from "../services/realtime/pollSocket";
import { Skeleton } from "../components/Skeleton";
import { BrandLogo } from "../components/BrandLogo";

function getSlugFromPath() {
	const match = window.location.pathname.match(
		/\/public\/poll\/([^/]+)\/results$/,
	);
	return match?.[1] ?? "";
}

function applyLiveVote(results: PollResults, event: PollVoteEvent) {
	if (results.poll.id !== event.pollId) return results;

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
			lastSubmittedAt: event.submittedAt ?? new Date().toISOString(),
		},
		questions,
	};
}

export default function PublicResults() {
	const slug = getSlugFromPath();
	const [results, setResults] = useState<PollResults | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		void (async () => {
			setIsLoading(true);
			setError(null);

			try {
				setResults(await pollService.getPublicPollResults(slug));
			} catch (loadError) {
				setError(
					getApiErrorMessage(
						loadError,
						"Poll results are not available.",
					),
				);
			} finally {
				setIsLoading(false);
			}
		})();
	}, [slug]);

	useEffect(() => {
		if (!results?.poll.id) return;

		const socket = createPollSocket();
		const pollId = results.poll.id;
		const join = () => joinPollRoom(socket, pollId);

		socket.on("connect", join);
		join();
		socket.on("poll:vote", (event: PollVoteEvent) => {
			setResults((currentResults) =>
				currentResults
					? applyLiveVote(currentResults, event)
					: currentResults,
			);
		});
		socket.on("poll:analytics", (event: PollAnalyticsEvent) => {
			if (event.pollId !== pollId) return;

			setResults((currentResults) =>
				currentResults
					? {
							...currentResults,
							summary: {
								...currentResults.summary,
								activeViewers:
									event.activeViewers ??
									currentResults.summary.activeViewers,
								regions:
									event.regions ??
									currentResults.summary.regions,
							},
						}
					: currentResults,
			);
		});

		return () => {
			leavePollRoom(socket, pollId);
			socket.disconnect();
		};
	}, [results?.poll.id]);

	if (isLoading) {
		return (
			<main className="min-h-screen bg-surface text-on-surface">
				<section className="mx-auto max-w-6xl space-y-gutter px-md py-xl">
					<header className="border-b border-outline-variant pb-lg space-y-sm">
						<div className="flex gap-sm">
							<Skeleton className="h-6 w-24 rounded-full" />
							<Skeleton className="h-6 w-20 rounded-full" />
						</div>
						<Skeleton className="h-10 w-2/3" />
						<Skeleton className="h-4 w-1/2" />
					</header>

					<div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
						{[...Array(3)].map((_, i) => (
							<div
								key={i}
								className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg space-y-xs">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-8 w-16" />
							</div>
						))}
					</div>

					<div className="rounded-xl border border-outline-variant bg-surface-container p-lg space-y-md">
						<Skeleton className="h-6 w-40" />
						<Skeleton className="h-48 w-full rounded-lg" />
					</div>

					<section className="space-y-lg">
						{[...Array(2)].map((_, i) => (
							<article
								className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg space-y-md"
								key={i}>
								<Skeleton className="h-6 w-1/2" />
								<div className="space-y-sm">
									{[...Array(3)].map((_, j) => (
										<div
											key={j}
											className="space-y-xs">
											<div className="flex justify-between">
												<Skeleton className="h-4 w-32" />
												<Skeleton className="h-4 w-16" />
											</div>
											<Skeleton className="h-2 w-full rounded-full" />
										</div>
									))}
								</div>
							</article>
						))}
					</section>
				</section>
			</main>
		);
	}

	if (!results) {
		return (
			<main className="min-h-screen bg-surface p-xl text-on-surface">
				<p className="mx-auto max-w-3xl rounded-xl border border-error-container bg-error-container p-xl text-on-error-container">
					{"Poll results are not available."}
				</p>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-surface text-on-surface">
			<section className="mx-auto max-w-6xl space-y-gutter px-md py-xl">
				<header className="border-b border-outline-variant pb-lg">
					<div className="mb-sm flex justify-between flex-wrap items-center gap-sm">
						<BrandLogo
							className="h-8 w-8"
							showText={true}
						/>
						<span className="rounded-full bg-primary-fixed px-3 py-1 font-sans text-label-md text-on-primary-fixed">
							{results.poll.status === "active"
								? "Live results"
								: "Final results"}
						</span>
					</div>
					<h1 className="font-serif text-display-md text-primary">
						{results.poll.title}
					</h1>
					{results.poll.description ? (
						<p className="mt-sm max-w-3xl font-sans text-on-surface-variant">
							{results.poll.description}
						</p>
					) : null}
				</header>

				<div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
					<Metric
						label="Responses"
						value={results.summary.totalResponses}
					/>
					<Metric
						label="Selections"
						value={results.summary.totalAnswerSelections}
					/>
					<Metric
						label="Authenticated"
						value={results.summary.authenticatedResponses}
					/>
				</div>

				<AudienceOriginCard
					activeViewers={results.summary.activeViewers}
					regions={results.summary.regions}
				/>

				<section className="space-y-lg">
					{results.questions.map((question, questionIndex) => (
						<article
							className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg"
							key={question.id}>
							<h2 className="mb-sm font-serif text-title-lg text-on-surface">
								{questionIndex + 1}. {question.questionText}
							</h2>
							<div className="space-y-md">
								{question.options.map((option) => (
									<div key={option.id}>
										<div className="mb-xs flex justify-between gap-md font-sans text-label-lg">
											<span>{option.optionText}</span>
											<span className="text-primary">
												{option.selectionCount} (
												{option.percentage}%)
											</span>
										</div>
										<div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
											<div
												className="h-full rounded-full bg-secondary-container"
												style={{
													width: `${option.percentage}%`,
												}}
											/>
										</div>
									</div>
								))}
							</div>
						</article>
					))}
				</section>
			</section>
		</main>
	);
}

function Metric({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
			<p className="font-sans text-label-md uppercase text-on-surface-variant">
				{label}
			</p>
			<p className="font-serif text-3xl font-bold text-primary">
				{value}
			</p>
		</div>
	);
}
