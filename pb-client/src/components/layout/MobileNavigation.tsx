import { Link } from "@tanstack/react-router";
import { primaryNavigation } from "./navigation";

export function MobileNavigation() {
	return (
		<nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 h-16 bg-surface-container border-t border-outline-variant">
			{primaryNavigation.map((item) => (
				<Link
					key={item.to}
					activeOptions={{ exact: item.exact }}
					activeProps={{
						className:
							"bg-primary-container text-on-primary-container rounded-full scale-95",
					}}
					aria-label={item.label}
					className="grid h-11 w-11 place-items-center text-on-surface-variant transition-all"
					title={item.label}
					to={item.to}>
					<span className="material-symbols-outlined">{item.icon}</span>
				</Link>
			))}
		</nav>
	);
}
