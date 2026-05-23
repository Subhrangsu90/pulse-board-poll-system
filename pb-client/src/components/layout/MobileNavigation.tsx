import { Link } from "@tanstack/react-router";
import { mobileNavigation } from "./navigation";

export function MobileNavigation() {
	return (
		<nav className="fixed bottom-0 left-0 z-50 flex h-16 w-full items-center justify-around border-t border-outline-variant bg-surface-container px-sm md:hidden">
			{mobileNavigation.map((item) => (
				<Link
					key={item.to}
					activeOptions={{ exact: item.exact }}
					activeProps={{
						className:
							"bg-primary-container text-on-primary-container rounded-full scale-95",
					}}
					aria-label={item.label}
					className="grid size-10 place-items-center text-on-primary-variant transition-all"
					title={item.label}
					to={item.to}>
					<span className="material-symbols-outlined">
						{item.icon}
					</span>
				</Link>
			))}
		</nav>
	);
}
