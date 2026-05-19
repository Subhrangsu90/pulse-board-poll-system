import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	ToastContext,
	type ToastContextValue,
	type ToastMessage,
	type ToastOptions,
	type ToastTone,
} from "./toastContext";

const TOAST_TIMEOUT_MS = 4200;

function createToastId() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getToastIcon(tone: ToastTone) {
	if (tone === "success") return "check_circle";
	if (tone === "info") return "info";
	return "error";
}

function getToastClassName(tone: ToastTone) {
	if (tone === "success") {
		return "border-primary-container bg-primary-fixed text-on-primary-fixed";
	}

	if (tone === "info") {
		return "border-outline-variant bg-inverse-surface text-inverse-on-surface";
	}

	return "border-error-container bg-error-container text-on-error-container";
}

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<ToastMessage[]>([]);

	const dismissToast = useCallback((toastId: string) => {
		setToasts((currentToasts) =>
			currentToasts.filter((toast) => toast.id !== toastId)
		);
	}, []);

	const showToast = useCallback((message: string, options?: ToastOptions) => {
		const toast: ToastMessage = {
			id: createToastId(),
			message,
			tone: options?.tone ?? "info",
		};

		setToasts((currentToasts) => [...currentToasts.slice(-3), toast]);
	}, []);

	const value = useMemo<ToastContextValue>(
		() => ({
			showToast,
			success: (message) => showToast(message, { tone: "success" }),
			error: (message) => showToast(message, { tone: "error" }),
			info: (message) => showToast(message, { tone: "info" }),
		}),
		[showToast]
	);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<div
				aria-live="polite"
				aria-relevant="additions"
				className="pointer-events-none fixed right-md top-md z-[80] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-sm">
				{toasts.map((toast) => (
					<ToastItem
						key={toast.id}
						onDismiss={dismissToast}
						toast={toast}
					/>
				))}
			</div>
		</ToastContext.Provider>
	);
}

function ToastItem({
	toast,
	onDismiss,
}: {
	toast: ToastMessage;
	onDismiss: (toastId: string) => void;
}) {
	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			onDismiss(toast.id);
		}, TOAST_TIMEOUT_MS);

		return () => window.clearTimeout(timeoutId);
	}, [onDismiss, toast.id]);

	return (
		<div
			className={`pointer-events-auto flex items-start gap-sm rounded-lg border px-md py-sm font-body-md text-body-md shadow-popover ${getToastClassName(
				toast.tone
			)}`}
			role={toast.tone === "error" ? "alert" : "status"}>
			<span className="material-symbols-outlined mt-0.5 text-[20px]">
				{getToastIcon(toast.tone)}
			</span>
			<p className="min-w-0 flex-1 break-words">{toast.message}</p>
			<button
				aria-label="Dismiss notification"
				className="rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100"
				onClick={() => onDismiss(toast.id)}
				type="button">
				<span className="material-symbols-outlined text-[18px]">close</span>
			</button>
		</div>
	);
}
