import { API_BASE_URL, apiGet, apiPatch } from "./apiService";

type CurrentUser = {
	id: string;
	email: string;
	name: string;
	picture?: string | null;
};

type UserPreferences = {
	defaultResponseMode: "anonymous" | "authenticated";
	themeMode: "light" | "dark" | "system";
	textScale: "compact" | "comfortable" | "large";
};

const authRoutes = {
	login: `${API_BASE_URL}/auth/login`,
	register: `${API_BASE_URL}/auth/register`,
	logout: "/auth/logout",
	currentUser: "/auth/current-user",
	optionalCurrentUser: "/auth/optional-current-user",
	preferences: "/auth/preferences",
} as const;

function getCurrentReturnTo() {
	return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function withReturnTo(url: string, returnTo = getCurrentReturnTo()) {
	const loginUrl = new URL(url, window.location.origin);
	loginUrl.searchParams.set("returnTo", returnTo);
	return loginUrl.toString();
}

export const authService = {
	login() {
		window.location.href = withReturnTo(authRoutes.login);
	},

	register() {
		window.location.href = withReturnTo(authRoutes.register);
	},

	async logout() {
		try {
			await apiGet(authRoutes.logout);
		} catch (error) {
			console.error("Logout failed", error);
		} finally {
			window.location.href = "/";
		}
	},

	async getCurrentUser() {
		return await apiGet<CurrentUser>(authRoutes.currentUser);
	},

	async getOptionalCurrentUser() {
		return await apiGet<CurrentUser | null>(authRoutes.optionalCurrentUser);
	},

	async getPreferences() {
		return await apiGet<UserPreferences>(authRoutes.preferences);
	},

	async updatePreferences(preferences: UserPreferences) {
		return await apiPatch<UserPreferences>(authRoutes.preferences, preferences);
	},
};

export type { CurrentUser, UserPreferences };
