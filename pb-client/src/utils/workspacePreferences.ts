import { authService, type UserPreferences } from "../services/api/authService";
import { defaultAppearance, type AppearancePreferences } from "./theme";

export type WorkspacePreferences = UserPreferences & AppearancePreferences;

const STORAGE_KEY = "pulseboard.workspace-preferences";

const defaultPreferences: WorkspacePreferences = {
	defaultResponseMode: "anonymous",
	...defaultAppearance,
};

function normalizePreferences(parsed: Partial<WorkspacePreferences>): WorkspacePreferences {
	return {
		defaultResponseMode:
			parsed.defaultResponseMode === "authenticated" ? "authenticated" : "anonymous",
		themeMode:
			parsed.themeMode === "light" || parsed.themeMode === "dark" || parsed.themeMode === "system"
				? parsed.themeMode
				: defaultPreferences.themeMode,
		textScale:
			parsed.textScale === "compact" ||
			parsed.textScale === "comfortable" ||
			parsed.textScale === "large"
				? parsed.textScale
				: defaultPreferences.textScale,
	};
}

export function getWorkspacePreferences(): WorkspacePreferences {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return defaultPreferences;

		return normalizePreferences(JSON.parse(stored) as Partial<WorkspacePreferences>);
	} catch {
		return defaultPreferences;
	}
}

export function saveWorkspacePreferences(preferences: WorkspacePreferences) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export async function loadWorkspacePreferencesFromServer() {
	const preferences = await authService.getPreferences();
	saveWorkspacePreferences(preferences);
	return preferences;
}

export async function saveWorkspacePreferencesToServer(preferences: WorkspacePreferences) {
	const saved = await authService.updatePreferences(preferences);
	saveWorkspacePreferences(saved);
	return saved;
}
