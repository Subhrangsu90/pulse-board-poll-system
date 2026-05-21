export type ThemeMode = "light" | "dark" | "system";
export type TextScale = "compact" | "comfortable" | "large";

export type AppearancePreferences = {
	themeMode: ThemeMode;
	textScale: TextScale;
};

export const defaultAppearance: AppearancePreferences = {
	themeMode: "system",
	textScale: "comfortable",
};

const THEME_MEDIA = "(prefers-color-scheme: dark)";

export function resolveThemeMode(mode: ThemeMode): "light" | "dark" {
	if (mode === "system") {
		return window.matchMedia(THEME_MEDIA).matches ? "dark" : "light";
	}

	return mode;
}

export function applyThemeMode(mode: ThemeMode) {
	const root = document.documentElement;

	if (mode === "system") {
		root.removeAttribute("data-theme");
	} else {
		root.setAttribute("data-theme", mode);
	}

	root.dataset.themeMode = mode;
}

export function applyTextScale(scale: TextScale) {
	document.documentElement.dataset.textScale = scale;
}

export function applyAppearance(preferences: AppearancePreferences) {
	applyThemeMode(preferences.themeMode);
	applyTextScale(preferences.textScale);
}

export function subscribeToSystemTheme(onChange: () => void) {
	const media = window.matchMedia(THEME_MEDIA);
	const handler = () => onChange();
	media.addEventListener("change", handler);
	return () => media.removeEventListener("change", handler);
}

export function getThemeToggleIcon(mode: ThemeMode, resolved: "light" | "dark") {
	if (mode === "system") return "brightness_auto";
	return resolved === "dark" ? "dark_mode" : "light_mode";
}
