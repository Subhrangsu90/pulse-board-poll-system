import { useEffect, useState } from "react";
import { authService, type CurrentUser } from "../services/api/authService";
import { pollService } from "../services/api/pollService";

export default function Dashboard() {
	const [user, setUser] = useState<CurrentUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		authService
			.getCurrentUser()
			.then(setUser)
			.catch(() => {
				authService.login();
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, []);

	const handleGetAllPolls = async () => {
		try {
			const polls = await pollService.getAllPolls();
			console.log("All polls:", polls);
		} catch (error) {
			console.error("Unable to fetch polls:", error);
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-surface px-margin py-xl text-on-surface">
				<p className="font-sans text-body-lg">Loading dashboard...</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-surface px-margin py-xl text-on-surface">
			<div className="mx-auto flex max-w-5xl items-center justify-between">
				<div>
					<p className="font-sans text-label-md text-on-surface-variant">
						Welcome back
					</p>
					<h1 className="font-serif text-headline-lg text-primary">
						{user?.name ?? user?.email ?? "PulseBoard user"}
					</h1>
				</div>
				<a
					className="rounded-full border border-outline px-md py-sm font-sans text-label-lg text-primary transition-colors hover:bg-surface-container-low"
					onClick={authService.logout}>
					Logout
				</a>
			</div>
			<div className="mx-auto mt-xl max-w-5xl">
				<button
					className="rounded-full bg-primary px-md py-sm font-sans text-label-lg text-on-primary transition-colors hover:bg-primary-container hover:text-on-primary-container"
					onClick={handleGetAllPolls}>
					Console Get All Polls
				</button>
			</div>
		</div>
	);
}
