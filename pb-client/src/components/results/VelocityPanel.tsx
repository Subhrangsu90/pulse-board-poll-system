import type { PollResults } from "../../services/api/pollService";

export interface VelocityPanelProps {
	completionPercent: number;
	responseRate: number;
	results: PollResults;
}

export function VelocityPanel({
	completionPercent,
	responseRate,
	results,
}: VelocityPanelProps) {
	const bars = [
		20,
		35,
		30,
		55,
		45,
		80,
		results.summary.totalResponses > 0 ? 100 : 12,
	];

	return (
		<div className="flex flex-col gap-gutter lg:col-span-5">
			<div className="flex-grow rounded-xl border border-outline-variant bg-surface-container-high p-lg">
				<div className="mb-4 flex items-start justify-between">
					<div>
						<p className="font-sans text-[10px] uppercase text-on-surface-variant">
							Response Velocity
						</p>
						<h4 className="font-serif text-2xl font-bold text-primary">
							{results.summary.totalResponses}
						</h4>
					</div>
					<span className="material-symbols-outlined text-primary">
						trending_up
					</span>
				</div>
				<div className="flex h-12 items-end gap-1">
					{bars.map((height, index) => (
						<div
							className={`w-full rounded-t-sm ${
								index === bars.length - 1
									? "animate-pulse bg-primary"
									: "bg-primary/40"
							}`}
							key={`${height}-${index}`}
							style={{ height: `${height}%` }}
						/>
					))}
				</div>
				<p className="mt-2 text-center text-[10px] text-on-surface-variant">
					Submissions / latest window
				</p>
			</div>
			<div className="flex flex-1 gap-gutter">
				<div className="flex flex-1 flex-col justify-center rounded-xl border border-outline-variant/20 bg-secondary-container p-4 text-on-secondary-container">
					<p className="mb-1 font-sans text-[10px] uppercase">
						Completion
					</p>
					<h4 className="font-serif text-2xl font-bold">
						{completionPercent}%
					</h4>
					<div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-on-secondary-container/20">
						<div
							className="h-full bg-on-secondary-container"
							style={{ width: `${completionPercent}%` }}
						/>
					</div>
				</div>
				<div className="flex flex-1 flex-col justify-center rounded-xl border border-outline-variant bg-surface-container-high p-4">
					<p className="mb-1 font-sans text-[10px] uppercase text-on-surface-variant">
						Avg. Reach
					</p>
					<h4 className="font-serif text-2xl font-bold text-on-surface">
						{responseRate}
					</h4>
					<p className="mt-1 flex items-center gap-1 text-[9px] text-on-surface-variant">
						<span className="material-symbols-outlined text-[10px]">
							timer
						</span>
						per question
					</p>
				</div>
			</div>
		</div>
	);
}
export default VelocityPanel;
