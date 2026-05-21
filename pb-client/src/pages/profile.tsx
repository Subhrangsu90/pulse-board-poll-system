import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "../components/toastContext";
import { getApiErrorMessage } from "../services/api/apiService";
import { authService, type CurrentUser } from "../services/api/authService";
import { pollService, type Poll } from "../services/api/pollService";

const fallbackAvatar =
	"https://lh3.googleusercontent.com/aida-public/AB6AXuBapolA7_kFN-5tyUgt014ox7TJNYqSact834XOLnputn0OtiraG2YjffWlUXRzxtH2Coz0Gln3Or_9lbFcc8LGLYk_pjhtH3cWbGcsGmD5Cy-Q90Rq9VBXyDSfALCKJ1eK5ztl6LMJ0A9rHgmEL6OaiaUKyNvq0NXwqsbDe8khwphtwe1sFmXVmuMzJlen0venVqiMSrKp_HpFwlk9T6PcYyaJ1UIn4nv0Bz4KltkGcWs2AIpAr0e5UENZerN18Jczc7AebQNBveWk";

export default function Profile() {
	const toast = useToast();
	const [user, setUser] = useState<CurrentUser | null>(null);
	const [polls, setPolls] = useState<Poll[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		void (async () => {
			try {
				const [currentUser, allPolls] = await Promise.all([
					authService.getCurrentUser(),
					pollService.getAllPolls(),
				]);
				setUser(currentUser);
				setPolls(allPolls);
			} catch (error) {
				toast.error(getApiErrorMessage(error, "Unable to load profile."));
			} finally {
				setIsLoading(false);
			}
		})();
	}, [toast]);

	const stats = useMemo(
		() => ({
			total: polls.length,
			active: polls.filter((poll) => poll.status === "active").length,
			drafts: polls.filter((poll) => poll.status === "draft").length,
			completed: polls.filter((poll) => poll.status === "completed").length,
		}),
		[polls]
	);

	return (
		<section className="space-y-xl">
			<div className="space-y-sm">
				<p className="font-sans text-label-lg text-primary">Profile</p>
				<h2 className="font-serif text-headline-lg text-on-background">Creator profile</h2>
				<p className="max-w-2xl font-sans text-body-lg text-on-surface-variant">
					Your signed-in account and workspace activity in PulseBoard.
				</p>
			</div>

			{isLoading ? (
				<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-xl">
					<p className="font-sans text-body-md text-on-surface-variant">Loading profile...</p>
				</div>
			) : (
				<>
					<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
						<div className="flex flex-col gap-lg md:flex-row md:items-center">
							<img
								alt=""
								className="h-20 w-20 rounded-full border border-outline-variant object-cover"
								src={user?.picture || fallbackAvatar}
							/>
							<div className="min-w-0 flex-1 space-y-xs">
								<h3 className="font-serif text-title-lg text-on-surface">
									{user?.name || "Creator"}
								</h3>
								<p className="font-sans text-body-md text-on-surface-variant">
									{user?.email || "No email on file"}
								</p>
								{user?.id ? (
									<p className="font-sans text-label-md text-on-surface-variant">
										Account ID: <span className="text-on-surface">{user.id}</span>
									</p>
								) : null}
							</div>
							<div className="flex flex-wrap gap-sm">
								<Link
									className="rounded-full bg-primary-container px-lg py-md font-sans text-label-lg font-bold text-on-primary-container transition-opacity hover:opacity-90"
									to="/settings">
									Workspace settings
								</Link>
								<button
									className="rounded-full border border-outline-variant px-lg py-md font-sans text-label-lg text-on-surface-variant transition-colors hover:bg-surface-container-high"
									onClick={() => void authService.logout()}
									type="button">
									Log out
								</button>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-gutter md:grid-cols-4">
						<StatCard label="Total polls" value={stats.total} />
						<StatCard label="Active" value={stats.active} />
						<StatCard label="Drafts" value={stats.drafts} />
						<StatCard label="Completed" value={stats.completed} />
					</div>

					<div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
						<Link
							className="rounded-xl border border-outline-variant bg-surface-container p-lg transition-colors hover:bg-surface-container-high"
							to="/create">
							<div className="flex items-center gap-md">
								<span className="material-symbols-outlined text-primary">add_circle</span>
								<div>
									<p className="font-serif text-title-lg text-on-surface">Create a poll</p>
									<p className="font-sans text-body-md text-on-surface-variant">
										Start a new audience question.
									</p>
								</div>
							</div>
						</Link>
						<Link
							className="rounded-xl border border-outline-variant bg-surface-container p-lg transition-colors hover:bg-surface-container-high"
							to="/polls">
							<div className="flex items-center gap-md">
								<span className="material-symbols-outlined text-primary">list_alt</span>
								<div>
									<p className="font-serif text-title-lg text-on-surface">Manage polls</p>
									<p className="font-sans text-body-md text-on-surface-variant">
										Edit, publish, and review your polls.
									</p>
								</div>
							</div>
						</Link>
					</div>
				</>
			)}
		</section>
	);
}

function StatCard({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
			<p className="font-sans text-label-md uppercase text-on-surface-variant">{label}</p>
			<p className="font-serif text-headline-md text-primary">{value}</p>
		</div>
	);
}
