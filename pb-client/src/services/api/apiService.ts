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

export { API_BASE_URL };
export type { ApiResponse };
