import { Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authService, type CurrentUser } from "../../services/api/authService";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { MobileNavigation } from "./MobileNavigation";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
	const [user, setUser] = useState<CurrentUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

	useEffect(() => {
		authService
			.getCurrentUser()
			.then(setUser)
			.catch(() => setUser(null))
			.finally(() => {
				setIsLoading(false);
			});
	}, []);

	if (isLoading) {
		return (
			<div className="grid min-h-screen place-items-center bg-background px-margin text-on-surface">
				<div className="flex w-full max-w-sm flex-col items-center gap-lg text-center">
					<div className="relative grid h-20 w-20 place-items-center rounded-full bg-primary-container text-on-primary-container shadow-popover">
						<span className="material-symbols-outlined text-headline-lg">
							hub
						</span>
						<span className="absolute inset-0 animate-ping rounded-full border border-primary opacity-25" />
					</div>
					<div className="space-y-xs">
						<p className="font-serif text-headline-md text-primary">
							PulseBoard
						</p>
						<p className="font-sans text-body-lg text-on-surface-variant">
							Preparing your workspace
						</p>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
						<div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-background text-on-background min-h-screen flex">
			<Sidebar
				isExpanded={isSidebarExpanded}
				onToggleExpanded={() =>
					setIsSidebarExpanded((isExpanded) => !isExpanded)
				}
				user={user}
			/>

			<div
				className={`flex-grow flex flex-col min-h-screen transition-[margin] duration-200 ${
					isSidebarExpanded ? "md:ml-80" : "md:ml-20"
				}`}>
				<Header user={user} />
				<main className="flex-grow p-gutter pb-24 md:pb-gutter max-w-6xl mx-auto w-full space-y-xl">
					<Outlet />
				</main>
				<Footer />
			</div>

			<MobileNavigation />
		</div>
	);
}
