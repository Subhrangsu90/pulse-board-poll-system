import { ResponseModeButton } from "./ResponseModeButton";
import type { PollRequirements } from "./types";

type PollRequirementsStepProps = {
	requirements: PollRequirements;
	onChange: (requirements: Partial<PollRequirements>) => void;
};

export function PollRequirementsStep({
	requirements,
	onChange,
}: PollRequirementsStepProps) {
	return (
		<>
			<section className="space-y-md rounded-xl border border-outline-variant bg-surface-container p-xl">
				<div className="flex flex-col gap-2">
					<label
						className="font-sans text-label-lg text-primary"
						htmlFor="poll-title">
						Title
					</label>
					<input
						className="w-full rounded-none border-x-0 border-b-2 border-t-0 border-outline bg-surface-container-low px-0 py-3 font-serif text-title-lg transition-colors placeholder:text-outline-variant focus:border-primary focus:ring-0"
						id="poll-title"
						onChange={(event) => onChange({ title: event.target.value })}
						placeholder="e.g., The Future of Remote Deep Work"
						type="text"
						value={requirements.title}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label
						className="font-sans text-label-lg text-primary"
						htmlFor="poll-description">
						Description
					</label>
					<textarea
						className="w-full resize-none rounded-none border-x-0 border-b-2 border-t-0 border-outline bg-surface-container-low px-0 py-3 font-sans text-body-md transition-colors placeholder:text-outline-variant focus:border-primary focus:ring-0"
						id="poll-description"
						onChange={(event) =>
							onChange({ description: event.target.value })
						}
						placeholder="Add context to guide your respondents' thinking..."
						rows={3}
						value={requirements.description}
					/>
				</div>
			</section>

			<div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
				<section className="flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container p-md">
					<div className="mb-md">
						<label className="mb-2 block font-sans text-label-lg text-primary">
							Response Mode
						</label>
						<div className="flex rounded-full border border-outline-variant bg-surface-container-low p-1">
							<ResponseModeButton
								isActive={requirements.responseMode === "anonymous"}
								label="Anonymous"
								onClick={() => onChange({ responseMode: "anonymous" })}
							/>
							<ResponseModeButton
								isActive={requirements.responseMode === "authenticated"}
								label="Authenticated"
								onClick={() =>
									onChange({ responseMode: "authenticated" })
								}
							/>
						</div>
					</div>
					<p className="font-sans text-label-md italic text-on-surface-variant">
						Anonymous responses encourage higher honesty in sensitive topics.
					</p>
				</section>

				<section className="rounded-xl border border-outline-variant bg-surface-container p-md">
					<label className="mb-2 block font-sans text-label-lg text-primary">
						Expires At
					</label>
					<div className="grid grid-cols-2 gap-md">
						<div className="relative">
							<input
								className="w-full appearance-none rounded-none border-x-0 border-b-2 border-t-0 border-outline bg-surface-container-low px-0 py-3 font-sans text-body-md focus:border-primary focus:ring-0"
								onChange={(event) =>
									onChange({ expiresDate: event.target.value })
								}
								type="date"
								value={requirements.expiresDate}
							/>
							<span className="material-symbols-outlined pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-primary">
								calendar_today
							</span>
						</div>
						<div className="relative">
							<input
								className="w-full appearance-none rounded-none border-x-0 border-b-2 border-t-0 border-outline bg-surface-container-low px-0 py-3 font-sans text-body-md focus:border-primary focus:ring-0"
								onChange={(event) =>
									onChange({ expiresTime: event.target.value })
								}
								type="time"
								value={requirements.expiresTime}
							/>
							<span className="material-symbols-outlined pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-primary">
								schedule
							</span>
						</div>
					</div>
					<p className="mt-4 font-sans text-label-md text-on-surface-variant">
						Defaults to 7 days from now.
					</p>
				</section>
			</div>
		</>
	);
}
