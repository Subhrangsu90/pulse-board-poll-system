import { authService, type CurrentUser } from "../../services/api/authService";

type HeaderProps = {
	user: CurrentUser | null;
};

const fallbackAvatar =
	"https://lh3.googleusercontent.com/aida-public/AB6AXuD0ApEj0CWHUBFrLe2rHkZsV4JJOTOU0KOcnS3HTx5Rd4bgGPXqWarJl5vD2SjO7jubyiRRe31Y4qOvtlj6QS2S6MZE7xeXaekrvBOI_enOyfJSuZCuMnoSTbDaFFM2_81HHf7UMdLhF9WFc2sQf4YqIlKPnrjlRWfQIzByr_gLqWtiGylcSDtI2vVcadW0bgoiSDiezMPikL8fFWDUhlq4fPv6mc3_RzixWxl6-iOMeAS4XpeeO-qU6ViMAwgiQn3bswwBjsE3nZzu";

export function Header({ user }: HeaderProps) {
	return (
		<header className="flex justify-between items-center w-full px-margin py-sm z-50 sticky top-0 bg-surface border-b border-outline-variant">
			<div className="flex items-center gap-md">
				<span className="font-serif text-headline-lg font-bold text-primary">
					PulseBoard
				</span>
			</div>
			<div className="flex items-center gap-md">
				<span className="hidden md:block font-sans text-label-lg text-on-surface-variant">
					Last synced: just now
				</span>
				<img
					alt="User profile avatar"
					className="w-8 h-8 rounded-full border border-outline object-cover"
					src={user?.picture || fallbackAvatar}
				/>
				<button
					aria-label="Log out"
					className="grid h-10 w-10 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-error"
					onClick={() => void authService.logout()}
					title="Log out"
					type="button">
					<span className="material-symbols-outlined">logout</span>
				</button>
			</div>
		</header>
	);
}
