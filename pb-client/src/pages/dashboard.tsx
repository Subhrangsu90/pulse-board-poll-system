import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { useToast } from "../components/toastContext";
import { getApiErrorMessage } from "../services/api/apiService";
import { pollService, type Poll, type PollsSummary } from "../services/api/pollService";
import { Skeleton } from "../components/Skeleton";

export default function Dashboard() {
	const toast = useToast();

	const { data: polls = [], isLoading: isLoadingPolls, error: pollsError } = useQuery<Poll[]>({
		queryKey: ["polls"],
		queryFn: () => pollService.getAllPolls(),
	});

	const { data: summary = null, isLoading: isLoadingSummary, error: summaryError } = useQuery<PollsSummary | null>({
		queryKey: ["pollsSummary"],
		queryFn: () => pollService.getPollsSummary(),
	});

	const isLoading = isLoadingPolls || isLoadingSummary;

	useEffect(() => {
		const error = pollsError || summaryError;
		if (error) {
			console.error("Unable to fetch dashboard data:", error);
			toast.error(getApiErrorMessage(error, "Unable to fetch dashboard data."));
		}
	}, [pollsError, summaryError, toast]);

	const activePolls = polls.filter((poll) => poll.status === "active");
	const draftPolls = polls.filter((poll) => poll.status === "draft");
	const completedPolls = polls.filter((poll) => poll.status === "completed");
	const totalResponses = summary?.totalResponses ?? 0;

	return (
		<section className="space-y-xl">
			<section>
				<div className="flex flex-col justify-between gap-md md:flex-row md:items-end">
					<div>
						<h2 className="font-serif text-headline-md text-on-surface mb-xs">
							Welcome back, Curator.
						</h2>
						<p className="font-sans text-body-lg text-on-surface-variant">
							Your audience is waiting for your next thoughtful
							inquiry.
						</p>
					</div>

					<Link
						className="flex w-fit items-center gap-2 rounded-full bg-primary-container px-lg py-md font-sans text-label-lg font-bold text-on-primary-container transition-all hover:opacity-90 active:scale-[0.98]"
						to="/create">
						<span className="material-symbols-outlined">
							add_circle
						</span>
						Create New Poll
					</Link>
				</div>
			</section>

			<section className="grid grid-cols-1 gap-gutter md:grid-cols-4">
				<MetricCard
					label="Total Polls"
					value={isLoading ? <Skeleton className="h-10 w-16 my-1" /> : polls.length}
				/>
				<MetricCard
					label="Active Polls"
					value={isLoading ? <Skeleton className="h-10 w-16 my-1" /> : activePolls.length}
					badge={activePolls.length > 0 ? "Live now" : undefined}
				/>
				<MetricCard
					label="Completed Polls"
					value={isLoading ? <Skeleton className="h-10 w-16 my-1" /> : completedPolls.length}
				/>

				<MetricCard
					label="Total Responses"
					value={isLoading ? <Skeleton className="h-10 w-16 my-1" /> : totalResponses}
				/>
			</section>

			<div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
				<section className="lg:col-span-8">
					<div className="mb-md flex items-center justify-between">
						<h3 className="font-serif text-title-lg text-on-surface">
							Active Polls
						</h3>
						<Link
							className="font-sans text-label-lg text-primary hover:underline"
							to="/polls">
							View All
						</Link>
					</div>

					<div className="space-y-md">
						{isLoading ? (
							<>
								<PollSkeleton />
								<PollSkeleton />
								<PollSkeleton />
							</>
						) : activePolls.length > 0 ? (
							activePolls.slice(0, 3).map((poll) => (
								<PollCard
									key={poll.id}
									poll={poll}
								/>
							))
						) : (
							<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
								<p className="font-sans text-body-md text-on-surface-variant">
									No active polls yet. Create one when you are
									ready to collect responses.
								</p>
							</div>
						)}
					</div>
				</section>

				<aside className="space-y-xl lg:col-span-4">
					<div>
						<div className="mb-md flex items-center justify-between gap-md">
							<h3 className="font-serif text-title-lg text-on-surface">
								Ongoing Drafts
							</h3>
							<Link
								className="font-sans text-label-lg text-primary hover:underline"
								to="/drafts">
								View
							</Link>
						</div>
						<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low">
							{isLoading ? (
								<div className="space-y-sm p-md">
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-3 w-1/2" />
								</div>
							) : draftPolls.length > 0 ? (
								draftPolls.slice(0, 3).map((poll) => (
									<Link
										className="block border-b border-outline-variant p-md transition-colors last:border-b-0 hover:bg-surface-container"
										key={poll.id}
										to="/drafts">
										<h5 className="font-sans font-bold text-on-surface">
											{poll.title}
										</h5>
										<p className="font-sans text-label-md text-on-surface-variant">
											Last edited{" "}
											{formatDate(
												poll.updatedAt ||
													poll.createdAt,
											)}
										</p>
									</Link>
								))
							) : (
								<div className="p-md">
									<p className="font-sans text-body-md text-on-surface-variant">
										No drafts yet.
									</p>
								</div>
							)}
						</div>
					</div>

					<div className="rounded-xl border border-primary/20 bg-primary-fixed p-lg text-on-primary-fixed shadow-sm">
						<span className="material-symbols-outlined text-primary mb-md">
							lightbulb
						</span>
						<h4 className="font-serif mb-sm">
							Insight of the Week
						</h4>
						<p className="font-sans mb-md">
							Active polls stay easier to manage when older drafts
							are reviewed before creating the next inquiry.
						</p>
						<Link
							className="flex items-center gap-1 font-sans font-bold text-on-primary-fixed hover:underline"
							to="/results">
							Explore Analytics
							<span className="material-symbols-outlined text-sm">
								north_east
							</span>
						</Link>
					</div>
				</aside>
			</div>
		</section>
	);
}

type MetricCardProps = {
	label: string;
	value: ReactNode;
	badge?: string;
};

function MetricCard({ label, value, badge }: MetricCardProps) {
	return (
		<div className="rounded-xl border border-outline-variant bg-surface-container p-lg transition-colors hover:bg-surface-container-high">
			<p className="font-sans text-label-md text-on-surface-variant mb-xs">
				{label}
			</p>
			<div className="flex items-baseline gap-2">
				<div className="font-serif text-display-lg text-primary leading-none">
					{value}
				</div>
				{badge ? (
					<span className="rounded bg-secondary-container px-2 py-0.5 font-sans text-label-md text-secondary">
						{badge}
					</span>
				) : null}
			</div>
		</div>
	);
}

function PollCard({ poll }: { poll: Poll }) {
	return (
		<a
			className="block cursor-pointer rounded-xl border border-outline-variant bg-surface-container-lowest p-md transition-all hover:bg-surface-container-high"
			href={`/results?pollId=${poll.id}`}>
			<div className="flex flex-col justify-between gap-md md:flex-row md:items-center">
				<div className="flex-1">
					<div className="mb-xs flex items-center gap-2">
						<span className="flex h-2 w-2 animate-pulse rounded-full bg-primary" />
						<span className="font-sans text-label-md text-primary">
							Live
						</span>
						<span className="text-outline-variant">•</span>
						<span className="font-sans text-label-md text-on-surface-variant">
							Expires {formatDate(poll.expiresAt)}
						</span>
					</div>
					<h4 className="font-serif text-title-lg text-on-surface transition-colors hover:text-primary">
						{poll.title}
					</h4>
					<p className="font-sans text-on-surface-variant mt-1">
						{poll.description || "No description"}
					</p>
				</div>
				<div className="flex items-center gap-xl md:border-l md:border-outline-variant md:pl-xl">
					<div className="text-center">
						<p className="font-serif text-primary">
							{poll.responseMode}
						</p>
						<p className="font-sans text-on-surface-variant">
							Mode
						</p>
					</div>
					<span className="material-symbols-outlined text-outline-variant">
						chevron_right
					</span>
				</div>
			</div>
		</a>
	);
}

function PollSkeleton() {
	return (
		<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md space-y-sm">
			<Skeleton className="h-4 w-40" />
			<Skeleton className="h-6 w-3/4" />
			<Skeleton className="h-4 w-1/2" />
		</div>
	);
}

function formatDate(value: string | null) {
	if (!value) return "recently";

	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
	}).format(new Date(value));
}
