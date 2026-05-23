import { useEffect, useState, useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
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
import { applyLiveVote, preserveLiveResults } from "../utils/resultHelpers";

function getInitialPollId() {
	return new URLSearchParams(window.location.search).get("pollId");
}

export function usePollResults() {
	const toast = useToast();
	const [polls, setPolls] = useState<Poll[]>([]);
	const selectedPollId = useAppStore((state) => state.selectedPollId);
	const setSelectedPollId = useAppStore((state) => state.setSelectedPollId);
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

				const initialPollId = selectedPollId || getInitialPollId();
				const fallbackPoll =
					loadedPolls.find((poll) => poll.id === initialPollId) ??
					loadedPolls.find((poll) => poll.status !== "draft") ??
					loadedPolls[0] ??
					null;

				if (!selectedPollId && fallbackPoll) {
					setSelectedPollId(fallbackPoll.id);
				}
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
	}, [selectedPollId, setSelectedPollId, toast]);

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

	return {
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
	};
}
