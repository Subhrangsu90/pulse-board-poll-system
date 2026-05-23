import { useQuery, useQueryClient } from "@tanstack/react-query";
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

export const WorkspacePreferencesContext = createContext<WorkspacePreferencesContextValue | null>(null);

export function WorkspacePreferencesProvider({ children }: { children: ReactNode }) {
	const queryClient = useQueryClient();
	const [isSaving, setIsSaving] = useState(false);

	const { data: preferences = getWorkspacePreferences(), isLoading } = useQuery<WorkspacePreferences>({
		queryKey: ["userPreferences"],
		queryFn: loadWorkspacePreferencesFromServer,
		initialData: () => getWorkspacePreferences(),
	});

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

	const updatePreferences = useCallback(async (patch: Partial<WorkspacePreferences>) => {
		const next = { ...preferences, ...patch };
		const previous = preferences;
		
		queryClient.setQueryData(["userPreferences"], next);
		setIsSaving(true);

		try {
			const saved = await saveWorkspacePreferencesToServer(next);
			queryClient.setQueryData(["userPreferences"], saved);
		} catch {
			queryClient.setQueryData(["userPreferences"], previous);
			throw new Error("Unable to save preferences.");
		} finally {
			setIsSaving(false);
		}
	}, [preferences, queryClient]);

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
