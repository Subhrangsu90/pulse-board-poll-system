import { useEffect, useState } from "react";
import { useWorkspacePreferences } from "../components/workspacePreferencesContext";
import { subscribeToSystemTheme } from "../utils/theme";

export function useThemeColors() {
	const { appearance } = useWorkspacePreferences();
	const [colors, setColors] = useState({
		primary: "#316342",
		secondary: "#4c644e",
		error: "#ba1a1a",
	});

	useEffect(() => {
		const updateColors = () => {
			const computed = getComputedStyle(document.documentElement);
			setColors({
				primary:
					computed.getPropertyValue("--color-primary").trim() ||
					"#316342",
				secondary:
					computed.getPropertyValue("--color-secondary").trim() ||
					"#4c644e",
				error:
					computed.getPropertyValue("--color-error").trim() ||
					"#ba1a1a",
			});
		};

		updateColors();
		const timer = window.setTimeout(updateColors, 50);

		let unsubscribe: (() => void) | undefined;
		if (appearance.themeMode === "system") {
			unsubscribe = subscribeToSystemTheme(updateColors);
		}

		return () => {
			window.clearTimeout(timer);
			if (unsubscribe) unsubscribe();
		};
	}, [appearance.themeMode]);

	return colors;
}
