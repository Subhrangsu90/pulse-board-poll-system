import axios from "axios";

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL ||
	import.meta.env.VITE_API_URL ||
	"/api/v1";

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

export const api = axios.create({
	baseURL: API_BASE_URL,
	withCredentials: true,
	headers: {
		"Content-Type": "application/json",
	},
});

let isRedirectingToLogin = false;

api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (axios.isAxiosError(error) && error.response?.status === 401) {
			const isPublicPage = window.location.pathname === "/";
			const requestUrl = error.config?.url ?? "";
			const isLogoutRequest = requestUrl.includes("/auth/logout");

			if (!isPublicPage && !isLogoutRequest && !isRedirectingToLogin) {
				isRedirectingToLogin = true;
				window.location.href = `${API_BASE_URL}/auth/login`;
			}
		}

		return Promise.reject(error);
	}
);

// generic GET
export async function apiGet<T>(path: string): Promise<T> {
	const { data } = await api.get<ApiResponse<T>>(path);
	return data.data;
}

// generic POST
export async function apiPost<T>(path: string, payload?: unknown): Promise<T> {
	const { data } = await api.post<ApiResponse<T>>(path, payload);
	return data.data;
}

export async function apiPut<T>(path: string, payload?: unknown): Promise<T> {
	const { data } = await api.put<ApiResponse<T>>(path, payload);
	return data.data;
}

export async function apiPatch<T>(path: string, payload?: unknown): Promise<T> {
	const { data } = await api.patch<ApiResponse<T>>(path, payload);
	return data.data;
}

export async function apiDelete<T>(path: string): Promise<T> {
	const { data } = await api.delete<ApiResponse<T>>(path);
	return data.data;
}

export { API_BASE_URL };
export type { ApiResponse };
