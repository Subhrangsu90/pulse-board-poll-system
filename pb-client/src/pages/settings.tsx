import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppearanceSettingsPanel } from "../components/ThemeControls";
import { useWorkspacePreferences } from "../components/workspacePreferencesContext";
import { useToast } from "../components/toastContext";
import { getApiErrorMessage } from "../services/api/apiService";
import { authService } from "../services/api/authService";
import { pollService, type VoteQueueHealth } from "../services/api/pollService";

export default function Settings() {
	const toast = useToast();
	const { appearance, isLoading, isSaving, preferences, updatePreferences } = useWorkspacePreferences();
	const [queueHealth, setQueueHealth] = useState<VoteQueueHealth | null>(null);
	const [isLoadingHealth, setIsLoadingHealth] = useState(true);
	const [healthError, setHealthError] = useState<string | null>(null);

	const loadQueueHealth = async () => {
		setIsLoadingHealth(true);
		setHealthError(null);

		try {
			setQueueHealth(await pollService.getVoteQueueHealth());
		} catch (error) {
			setHealthError(getApiErrorMessage(error, "Unable to load vote queue status."));
		} finally {
			setIsLoadingHealth(false);
		}
	};

	useEffect(() => {
		void loadQueueHealth();
	}, []);

	const handleAppearanceChange = async (nextAppearance: typeof appearance) => {
		try {
			await updatePreferences(nextAppearance);
			toast.success("Appearance saved to your account.");
		} catch (error) {
			toast.error(getApiErrorMessage(error, "Unable to save appearance."));
		}
	};

	return (
		<section className="space-y-xl">
			<div className="space-y-sm">
				<p className="font-sans text-label-lg text-primary">Settings</p>
				<h2 className="font-serif text-headline-lg text-on-background">Workspace settings</h2>
				<p className="max-w-2xl font-sans text-body-lg text-on-surface-variant">
					Appearance, poll defaults, and operational status for live vote processing.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
				<section className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
					<div className="flex items-center gap-md border-b border-outline-variant pb-md">
						<span className="material-symbols-outlined text-primary">palette</span>
						<div>
							<h3 className="font-serif text-title-lg text-on-surface">Appearance</h3>
							<p className="font-sans text-body-md text-on-surface-variant">
								Theme and text size for this workspace.
							</p>
						</div>
					</div>
					<AppearanceSettingsPanel
						appearance={appearance}
						disabled={isLoading || isSaving}
						onAppearanceChange={handleAppearanceChange}
					/>
				</section>

				<section className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
					<div className="flex items-center gap-md border-b border-outline-variant pb-md">
						<span className="material-symbols-outlined text-primary">tune</span>
						<div>
							<h3 className="font-serif text-title-lg text-on-surface">Poll defaults</h3>
							<p className="font-sans text-body-md text-on-surface-variant">
								Applied when you start a new poll.
							</p>
						</div>
					</div>

					<label className="block space-y-xs">
						<span className="font-sans text-label-lg text-on-surface">Default response mode</span>
						<select
							className="w-full rounded-lg border border-outline-variant bg-surface-container px-md py-sm font-sans text-body-md text-on-surface"
							disabled={isLoading || isSaving}
							onChange={(event) =>
								void updatePreferences({
									defaultResponseMode: event.target.value as typeof preferences.defaultResponseMode,
								})
									.then(() => toast.success("Preferences saved to your account."))
									.catch((error) =>
										toast.error(getApiErrorMessage(error, "Unable to save preferences."))
									)
							}
							value={preferences.defaultResponseMode}>
							<option value="anonymous">Anonymous</option>
							<option value="authenticated">Authenticated</option>
						</select>
					</label>
					<p className="font-sans text-label-md text-on-surface-variant">
						Synced to your account across devices.
					</p>
				</section>

				<section className="space-y-md rounded-xl border border-outline-variant bg-surface-container p-lg lg:col-span-2">
					<div className="flex items-center gap-md border-b border-outline-variant pb-md">
						<span className="material-symbols-outlined text-primary">person</span>
						<div>
							<h3 className="font-serif text-title-lg text-on-surface">Account</h3>
							<p className="font-sans text-body-md text-on-surface-variant">
								Profile and sign-in for this workspace.
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-sm md:grid-cols-2">
						<Link
							className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm transition-colors hover:bg-surface-container-high"
							to="/profile">
							<span className="font-sans text-label-lg text-on-surface">View profile</span>
							<span className="material-symbols-outlined text-icon-md text-on-surface-variant">
								chevron_right
							</span>
						</Link>
						<button
							className="flex w-full items-center justify-center gap-xs rounded-full border border-outline-variant px-lg py-md font-sans text-label-lg text-error transition-colors hover:bg-error-container hover:text-on-error-container"
							onClick={() => void authService.logout()}
							type="button">
							<span className="material-symbols-outlined text-icon-md">logout</span>
							Log out
						</button>
					</div>
				</section>
			</div>

			<section className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
				<div className="flex flex-wrap items-start justify-between gap-md border-b border-outline-variant pb-md">
					<div className="flex items-center gap-md">
						<span className="material-symbols-outlined text-primary">monitoring</span>
						<div>
							<h3 className="font-serif text-title-lg text-on-surface">Live vote pipeline</h3>
							<p className="max-w-2xl font-sans text-body-md text-on-surface-variant">
								Public poll votes are queued in Redis (BullMQ) and processed by a background worker
								before counts update.
							</p>
						</div>
					</div>
					<button
						className="rounded-full border border-outline-variant px-md py-sm font-sans text-label-lg text-primary transition-colors hover:bg-surface-container-high disabled:opacity-60"
						disabled={isLoadingHealth}
						onClick={() => void loadQueueHealth()}
						type="button">
						Refresh
					</button>
				</div>

				{isLoadingHealth ? (
					<p className="font-sans text-body-md text-on-surface-variant">Checking queue status...</p>
				) : healthError ? (
					<p className="rounded-lg bg-error-container px-md py-sm font-sans text-body-md text-on-error-container">
						{healthError}
					</p>
				) : queueHealth ? (
					<>
						<p className="font-sans text-label-md text-on-surface-variant">
							Queue: <span className="text-on-surface">{queueHealth.queue}</span>
						</p>
						<div className="grid grid-cols-2 gap-gutter md:grid-cols-3 lg:grid-cols-6">
							<QueueMetric label="Waiting" value={queueHealth.waiting} />
							<QueueMetric label="Active" value={queueHealth.active} />
							<QueueMetric label="Delayed" value={queueHealth.delayed} />
							<QueueMetric label="Failed" value={queueHealth.failed} highlight={queueHealth.failed > 0} />
							<QueueMetric label="Completed" value={queueHealth.completed} />
							<QueueMetric
								highlight={queueHealth.deadLetter > 0}
								label="Dead letter"
								value={queueHealth.deadLetter}
							/>
						</div>
					</>
				) : null}
			</section>
		</section>
	);
}

function QueueMetric({
	label,
	value,
	highlight = false,
}: {
	label: string;
	value: number;
	highlight?: boolean;
}) {
	return (
		<div
			className={`rounded-xl border p-md text-center ${
				highlight
					? "border-error bg-error-container text-on-error-container"
					: "border-outline-variant bg-surface-container"
			}`}>
			<p className="font-sans text-label-md uppercase opacity-80">{label}</p>
			<p className="font-serif text-headline-md font-bold">{value}</p>
		</div>
	);
}
