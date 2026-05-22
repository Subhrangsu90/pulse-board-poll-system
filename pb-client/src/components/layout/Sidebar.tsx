import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { authService, type CurrentUser } from "../../services/api/authService";
import { primaryNavigation } from "./navigation";
import { BrandLogo } from "../BrandLogo";

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
			<div className="mb-4 flex h-10 items-center justify-between px-md">
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
							className="grid size-10 shrink-0 place-items-center rounded-full text-primary transition-colors hover:bg-surface-container-high">
							{isBrandHovered ? (
								<span className="material-symbols-outlined">
									left_panel_open
								</span>
							) : (
								<BrandLogo
									className="h-6 w-6"
									showText={false}
								/>
							)}
						</button>
					)}

					{/* Expanded state */}
					{isExpanded && (
						<>
							<div
								aria-label="Votyx"
								className="flex h-10 items-center text-primary"
								title="Votyx">
								<BrandLogo
									showText={false}
									className="h-6 w-6"
									textClassName="font-serif text-title-lg font-bold text-primary"
								/>
							</div>
							<button
								type="button"
								onClick={onToggleExpanded}
								aria-label="Collapse sidebar"
								aria-expanded={isExpanded}
								title="Collapse sidebar"
								className="grid size-10 shrink-0 place-items-center rounded-full text-primary transition-colors hover:bg-surface-container-high">
								<span className="material-symbols-outlined">
									left_panel_close
								</span>
							</button>
						</>
					)}
				</div>
			</div>
			<Link
				className="mb-8 flex items-center gap-md px-md transition-colors hover:opacity-90"
				title="Profile"
				to="/profile">
				<img
					alt="User avatar"
					className="size-10 rounded-full bg-secondary-container object-cover"
					src={user?.picture || fallbackAvatar}
				/>
				<div
					className={`min-w-0 whitespace-nowrap transition-opacity duration-150 ${
						isExpanded ? "opacity-100" : "opacity-0"
					}`}>
					<p className="truncate font-serif text-title-lg text-on-surface">
						{user?.name || "Creator Workspace"}
					</p>
					<p className="truncate font-sans text-label-md text-on-surface-variant">
						{user?.email || "Digital Mindfulness Pro"}
					</p>
				</div>
			</Link>
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
						className="mx-2 flex h-12 items-center gap-md rounded-full px-md text-on-surface-variant transition-all hover:bg-surface-container-high"
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

			<div className="px-sm">
				<button
					aria-label="Log out"
					className="flex h-12 w-full items-center gap-md rounded-full px-md text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
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
