import { createContext, useContext } from "react";

export type ToastTone = "error" | "success" | "info";

export type ToastMessage = {
	id: string;
	message: string;
	tone: ToastTone;
};

export type ToastOptions = {
	tone?: ToastTone;
};

export type ToastContextValue = {
	showToast: (message: string, options?: ToastOptions) => void;
	success: (message: string) => void;
	error: (message: string) => void;
	info: (message: string) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
	const toast = useContext(ToastContext);

	if (!toast) {
		throw new Error("useToast must be used inside ToastProvider.");
	}

	return toast;
}
