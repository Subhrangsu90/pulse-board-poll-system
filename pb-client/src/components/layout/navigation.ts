export type NavigationItem = {
	label: string;
	icon: string;
	to:
		| "/dashboard"
		| "/results"
		| "/polls"
		| "/settings"
		| "/create"
		| "/drafts"
		| "/profile";
	exact?: boolean;
};

export const mobileNavigation: NavigationItem[] = [
	{
		label: "Dashboard",
		icon: "dashboard",
		to: "/dashboard",
		exact: true,
	},
	{
		label: "Create",
		icon: "add_circle",
		to: "/create",
	},
	{
		label: "Results",
		icon: "insert_chart",
		to: "/results",
	},
	{
		label: "My Polls",
		icon: "list_alt",
		to: "/polls",
	},
	{
		label: "Profile",
		icon: "person",
		to: "/profile",
	},
	{
		label: "Settings",
		icon: "settings",
		to: "/settings",
	},
];

export const primaryNavigation: NavigationItem[] = [
	{
		label: "Dashboard",
		icon: "dashboard",
		to: "/dashboard",
		exact: true,
	},
	{
		label: "Create",
		icon: "add_circle",
		to: "/create",
	},
	{
		label: "Results",
		icon: "insert_chart",
		to: "/results",
	},
	{
		label: "My Polls",
		icon: "list_alt",
		to: "/polls",
	},
	{
		label: "Settings",
		icon: "settings",
		to: "/settings",
	},
];
