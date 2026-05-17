import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { authService, type CurrentUser } from "../../services/api/authService";
import { primaryNavigation } from "./navigation";

type SidebarProps = {
	user: CurrentUser | null;
	isExpanded: boolean;
	onToggleExpanded: () => void;
};

const fallbackAvatar =
	"https://lh3.googleusercontent.com/aida-public/AB6AXuBapolA7_kFN-5tyUgt014ox7TJNYqSact834XOLnputn0OtiraG2YjffWlUXRzxtH2Coz0Gln3Or_9lbFcc8LGLYk_pjhtH3cWbGcsGmD5Cy-Q90Rq9VBXyDSfALCKJ1eK5ztl6LMJ0A9rHgmEL6OaiaUKyNvq0NXwqsbDe8khwphtwe1sFmXVmuMzJlen0venVqiMSrKp_HpFwlk9T6PcYyaJ1UIn4nv0Bz4KltkGcWs2AIpAr0e5UENZerN18Jczc7AebQNBveWk";

export function Sidebar({ user, isExpanded, onToggleExpanded }: SidebarProps) {
	const [isBrandHovered, setIsBrandHovered] = useState(false);

	return (
		<aside
			className={`hidden md:flex fixed left-0 top-0 h-full flex-col py-6 bg-surface-container-low border-r border-outline-variant z-40 overflow-hidden transition-[width] duration-200 ${
				isExpanded ? "w-80" : "w-20"
			}`}>
			<div className="mb-4 flex h-10 items-center justify-between px-5">
				<div
					className="relative flex min-w-0 w-full items-center justify-between gap-md"
					onMouseEnter={() => setIsBrandHovered(true)}
					onMouseLeave={() => setIsBrandHovered(false)}>
					{/* Collapsed state */}
					{!isExpanded && (
						<button
							type="button"
							onClick={onToggleExpanded}
							aria-label="Expand sidebar"
							aria-expanded={isExpanded}
							title="Expand sidebar"
							className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-primary transition-colors hover:bg-surface-container-high">
							<span className="material-symbols-outlined">
								{isBrandHovered ? "left_panel_open" : "hub"}
							</span>
						</button>
					)}

					{/* Expanded state */}
					{isExpanded && (
						<>
							<div
								aria-label="PulseBoard"
								className="grid h-10 w-10 place-items-center text-primary"
								title="PulseBoard">
								<span className="material-symbols-outlined">
									hub
								</span>
							</div>
							<button
								type="button"
								onClick={onToggleExpanded}
								aria-label="Collapse sidebar"
								aria-expanded={isExpanded}
								title="Collapse sidebar"
								className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-primary transition-colors hover:bg-surface-container-high">
								<span className="material-symbols-outlined">
									left_panel_close
								</span>
							</button>
						</>
					)}
				</div>
			</div>
			<div className="mb-8 flex items-center gap-4 px-5">
				<img
					alt="User avatar"
					className="w-10 h-10 rounded-full bg-secondary-container object-cover"
					src={user?.picture || fallbackAvatar}
				/>
				<div
					className={`min-w-0 whitespace-nowrap transition-opacity duration-150 ${
						isExpanded ? "opacity-100" : "opacity-0"
					}`}>
					<p className="font-serif text-title-lg text-on-surface truncate">
						{user?.name || "Creator Workspace"}
					</p>
					<p className="font-sans text-label-md text-on-surface-variant truncate">
						{user?.email || "Digital Mindfulness Pro"}
					</p>
				</div>
			</div>
			<nav className="flex-grow space-y-1">
				{primaryNavigation.map((item) => (
					<Link
						key={item.to}
						activeOptions={{ exact: item.exact }}
						activeProps={{
							className:
								"bg-secondary-container text-on-secondary-container font-bold",
						}}
						aria-label={item.label}
						className="flex h-12 items-center gap-4 text-on-surface-variant px-5 mx-2 hover:bg-surface-container-high transition-all rounded-full"
						title={item.label}
						to={item.to}>
						<span className="material-symbols-outlined shrink-0">
							{item.icon}
						</span>
						<span
							className={`whitespace-nowrap font-sans text-label-lg transition-opacity duration-150 ${
								isExpanded ? "opacity-100" : "opacity-0"
							}`}>
							{item.label}
						</span>
					</Link>
				))}
			</nav>

			<div className="px-2">
				<button
					aria-label="Log out"
					className="flex h-12 w-full items-center gap-4 rounded-full px-5 text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
					onClick={() => void authService.logout()}
					title="Log out"
					type="button">
					<span className="material-symbols-outlined shrink-0">
						logout
					</span>
					<span
						className={`whitespace-nowrap font-sans text-label-lg transition-opacity duration-150 ${
							isExpanded ? "opacity-100" : "opacity-0"
						}`}>
						Log out
					</span>
				</button>
			</div>
		</aside>
	);
}
