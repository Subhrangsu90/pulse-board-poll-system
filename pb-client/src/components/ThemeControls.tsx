import { useEffect, useState } from "react";
import {
	applyAppearance,
	resolveThemeMode,
	subscribeToSystemTheme,
	type AppearancePreferences,
	type TextScale,
	type ThemeMode,
} from "../utils/theme";

type ThemeControlsProps = {
	appearance: AppearancePreferences;
	onAppearanceChange: (appearance: AppearancePreferences) => void | Promise<void>;
	compact?: boolean;
	disabled?: boolean;
};

export function ThemeToggleButton({
	appearance,
	onAppearanceChange,
	disabled = false,
}: Pick<ThemeControlsProps, "appearance" | "onAppearanceChange" | "disabled">) {
	const [resolved, setResolved] = useState<"light" | "dark">(() =>
		resolveThemeMode(appearance.themeMode)
	);

	useEffect(() => {
		applyAppearance(appearance);
		setResolved(resolveThemeMode(appearance.themeMode));
		return subscribeToSystemTheme(() => {
			setResolved(resolveThemeMode(appearance.themeMode));
		});
	}, [appearance]);

	const cycleTheme = () => {
		const order: ThemeMode[] = ["light", "dark", "system"];
		const next = order[(order.indexOf(appearance.themeMode) + 1) % order.length];
		void onAppearanceChange({ ...appearance, themeMode: next });
	};

	const icon =
		appearance.themeMode === "system"
			? "brightness_auto"
			: resolved === "dark"
				? "dark_mode"
				: "light_mode";

	return (
		<button
			aria-label={`Theme: ${appearance.themeMode}. Click to change.`}
			className="grid size-10 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary disabled:opacity-60"
			disabled={disabled}
			onClick={cycleTheme}
			title={`Theme (${appearance.themeMode})`}
			type="button">
			<span className="material-symbols-outlined text-icon-md">{icon}</span>
		</button>
	);
}

export function AppearanceSettingsPanel({
	appearance,
	onAppearanceChange,
	disabled = false,
}: ThemeControlsProps) {
	useEffect(() => {
		applyAppearance(appearance);
		return subscribeToSystemTheme(() => {
			applyAppearance(appearance);
		});
	}, [appearance]);

	return (
		<div className="space-y-md">
			<label className="block space-y-xs">
				<span className="font-sans text-label-lg text-on-surface">Color theme</span>
				<select
					className="w-full rounded-lg border border-outline-variant bg-surface-container px-md py-sm font-sans text-body-md text-on-surface"
					disabled={disabled}
					onChange={(event) =>
						void onAppearanceChange({
							...appearance,
							themeMode: event.target.value as ThemeMode,
						})
					}
					value={appearance.themeMode}>
					<option value="system">System</option>
					<option value="light">Light</option>
					<option value="dark">Dark</option>
				</select>
			</label>

			<label className="block space-y-xs">
				<span className="font-sans text-label-lg text-on-surface">Text size</span>
				<select
					className="w-full rounded-lg border border-outline-variant bg-surface-container px-md py-sm font-sans text-body-md text-on-surface"
					disabled={disabled}
					onChange={(event) =>
						void onAppearanceChange({
							...appearance,
							textScale: event.target.value as TextScale,
						})
					}
					value={appearance.textScale}>
					<option value="compact">Compact</option>
					<option value="comfortable">Comfortable</option>
					<option value="large">Large</option>
				</select>
			</label>

			<p className="font-sans text-label-md text-on-surface-variant">
				Uses relative <code className="text-on-surface">rem</code> sizing so layout scales with your
				preferred text size. Theme syncs to your account.
			</p>
		</div>
	);
}
