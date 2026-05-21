import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import {
	getWorkspacePreferences,
	loadWorkspacePreferencesFromServer,
	saveWorkspacePreferencesToServer,
	type WorkspacePreferences,
} from "../utils/workspacePreferences";
import { applyAppearance, type AppearancePreferences } from "../utils/theme";

type WorkspacePreferencesContextValue = {
	preferences: WorkspacePreferences;
	appearance: AppearancePreferences;
	isLoading: boolean;
	isSaving: boolean;
	updatePreferences: (patch: Partial<WorkspacePreferences>) => Promise<void>;
};

const WorkspacePreferencesContext = createContext<WorkspacePreferencesContextValue | null>(null);

export function WorkspacePreferencesProvider({ children }: { children: ReactNode }) {
	const [preferences, setPreferences] = useState<WorkspacePreferences>(() => getWorkspacePreferences());
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	const appearance = useMemo<AppearancePreferences>(
		() => ({
			themeMode: preferences.themeMode,
			textScale: preferences.textScale,
		}),
		[preferences.themeMode, preferences.textScale]
	);

	useEffect(() => {
		applyAppearance(appearance);
	}, [appearance]);

	useEffect(() => {
		void (async () => {
			try {
				const loaded = await loadWorkspacePreferencesFromServer();
				setPreferences(loaded);
			} catch {
				applyAppearance({
					themeMode: preferences.themeMode,
					textScale: preferences.textScale,
				});
			} finally {
				setIsLoading(false);
			}
		})();
	}, []);

	const updatePreferences = useCallback(async (patch: Partial<WorkspacePreferences>) => {
		const next = { ...preferences, ...patch };
		const previous = preferences;
		setPreferences(next);
		setIsSaving(true);

		try {
			const saved = await saveWorkspacePreferencesToServer(next);
			setPreferences(saved);
		} catch {
			setPreferences(previous);
			throw new Error("Unable to save preferences.");
		} finally {
			setIsSaving(false);
		}
	}, [preferences]);

	const value = useMemo(
		() => ({
			preferences,
			appearance,
			isLoading,
			isSaving,
			updatePreferences,
		}),
		[appearance, isLoading, isSaving, preferences, updatePreferences]
	);

	return (
		<WorkspacePreferencesContext.Provider value={value}>{children}</WorkspacePreferencesContext.Provider>
	);
}

export function useWorkspacePreferences() {
	const context = useContext(WorkspacePreferencesContext);
	if (!context) {
		throw new Error("useWorkspacePreferences must be used within WorkspacePreferencesProvider.");
	}

	return context;
}
