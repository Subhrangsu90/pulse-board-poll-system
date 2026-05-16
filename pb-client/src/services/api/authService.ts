import { API_BASE_URL, apiGet } from "./apiService";

type CurrentUser = {
	id: string;
	email: string;
	name: string;
	picture?: string | null;
};

const authRoutes = {
	login: `${API_BASE_URL}/auth/login`,
	register: `${API_BASE_URL}/auth/register`,
	logout: `${API_BASE_URL}/auth/logout`,
	currentUser: "/auth/current-user",
} as const;

export const authService = {
	login() {
		window.location.href = authRoutes.login;
	},

	register() {
		window.location.href = authRoutes.register;
	},

	logout() {
		window.location.href = authRoutes.logout;
	},

	async getCurrentUser() {
		return await apiGet<CurrentUser>(authRoutes.currentUser);
	},
};

export type { CurrentUser };
