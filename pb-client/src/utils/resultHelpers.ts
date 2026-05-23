import type { Poll, PollResults } from "../services/api/pollService";
import type { PollVoteEvent } from "../services/realtime/pollSocket";

export function formatDateTime(value: string | null) {
	if (!value) return "No responses yet";

	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}

export function getPollLink(poll: PollResults["poll"]) {
	if (!poll.publicSlug) return null;

	return `${window.location.origin}/public/poll/${poll.publicSlug}`;
}

export function getTimeRemaining(expiresAt: string) {
	const diffMs = new Date(expiresAt).getTime() - Date.now();

	if (diffMs <= 0) return "Closed";

	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const days = Math.floor(diffHours / 24);
	const hours = diffHours % 24;

	if (days > 0) return `${days}d ${hours}h remaining`;
	return `${hours}h remaining`;
}

export function getStatusClass(status: Poll["status"]) {
	if (status === "active")
		return "bg-primary-container text-on-primary-container";
	if (status === "completed")
		return "bg-secondary-container text-on-secondary-container";
	if (status === "expired")
		return "bg-error-container text-on-error-container";
	return "bg-surface-container-high text-on-surface-variant";
}

export function applyLiveVote(
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

export function preserveLiveResults(
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
