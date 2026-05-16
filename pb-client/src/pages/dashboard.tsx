import { useEffect, useState } from "react";
import { authService, type CurrentUser } from "../services/api/authService";

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
		</div>
	);
}
