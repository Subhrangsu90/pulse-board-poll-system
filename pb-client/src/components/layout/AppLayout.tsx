import { useQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { WorkspacePreferencesProvider } from "../workspacePreferencesContext";
import { authService, type CurrentUser } from "../../services/api/authService";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { MobileNavigation } from "./MobileNavigation";
import { Sidebar } from "./Sidebar";
import { BrandLogo } from "../BrandLogo";

export function AppLayout() {
	const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

	const { data: user = null, isLoading } = useQuery<CurrentUser | null>({
		queryKey: ["currentUser"],
		queryFn: async () => {
			try {
				return await authService.getCurrentUser();
			} catch {
				return null;
			}
		},
	});

	if (isLoading) {
		return (
			<div className="grid min-h-screen place-items-center bg-background px-margin text-on-surface">
				<div className="flex w-full max-w-sm flex-col items-center gap-lg text-center">
					<BrandLogo
						className="h-16 w-16"
						showText={false}
					/>
					<div className="space-y-xs">
						<p className="font-serif text-headline-md text-primary">
							Votyx
						</p>
						<p className="font-sans text-body-lg text-on-surface-variant ">
							Preparing your workspace
						</p>
					</div>
					<div className="h-0.5 w-full overflow-hidden rounded-full bg-surface-container-high">
						<div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
					</div>
				</div>
			</div>
		);
	}

	return (
		<WorkspacePreferencesProvider>
			<div className="flex min-h-screen bg-background text-on-background">
				<Sidebar
					isExpanded={isSidebarExpanded}
					onToggleExpanded={() =>
						setIsSidebarExpanded((isExpanded) => !isExpanded)
					}
					user={user}
				/>

				<div
					className={`flex min-h-screen flex-grow flex-col transition-[margin] duration-200 ${
						isSidebarExpanded ? "md:ml-80" : "md:ml-20"
					}`}>
					<Header user={user} />
					<main className="mx-auto w-full max-w-6xl flex-grow space-y-xl p-gutter pb-24 md:pb-gutter">
						<Outlet />
					</main>
					<Footer />
				</div>

				<MobileNavigation />
			</div>
		</WorkspacePreferencesProvider>
	);
}
