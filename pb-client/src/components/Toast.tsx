import { type ReactNode, useMemo, useContext } from "react";
import { Toaster, toast } from "sonner";
import {
	ToastContext,
	type ToastContextValue,
} from "./toastContext";
import { WorkspacePreferencesContext } from "./workspacePreferencesContext";
import { getWorkspacePreferences } from "../utils/workspacePreferences";

export function ToastProvider({ children }: { children: ReactNode }) {
	const context = useContext(WorkspacePreferencesContext);
	const theme = context?.appearance.themeMode ?? getWorkspacePreferences().themeMode;

	const value = useMemo<ToastContextValue>(
		() => ({
			showToast: (message, options) => {
				const tone = options?.tone ?? "info";
				if (tone === "success") {
					toast.success(message);
				} else if (tone === "error") {
					toast.error(message);
				} else {
					toast.info(message);
				}
			},
			success: (message) => toast.success(message),
			error: (message) => toast.error(message),
			info: (message) => toast.info(message),
		}),
		[],
	);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<Toaster richColors position="top-right" theme={theme === "system" ? "system" : theme} />
		</ToastContext.Provider>
	);
}
