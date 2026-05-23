import { useMemo } from "react";
import { useEChart, type EChartsOption } from "../../hooks/useEChart";
import { useThemeColors } from "../../hooks/useThemeColors";
import { SplitBar } from "./SplitBar";
import type { PollResults } from "../../services/api/pollService";

export interface AudienceSegmentsPanelProps {
	results: PollResults;
}

export function AudienceSegmentsPanel({ results }: AudienceSegmentsPanelProps) {
	const colors = useThemeColors();
	const chartOption = useMemo<EChartsOption>(
		() => ({
			color: [colors.primary, colors.secondary, colors.error],
			legend: { bottom: 0 },
			tooltip: { trigger: "item" },
			series: [
				{
					type: "pie",
					radius: ["48%", "72%"],
					center: ["50%", "42%"],
					data: [
						{
							name: "Anonymous",
							value: results.summary.anonymousResponses,
						},
						{
							name: "Authenticated",
							value: results.summary.authenticatedResponses,
						},
					],
					label: { formatter: "{b}: {c}" },
				},
			],
		}),
		[
			results.summary.anonymousResponses,
			results.summary.authenticatedResponses,
			colors.primary,
			colors.secondary,
			colors.error,
		],
	);
	const chartRef = useEChart(chartOption);

	return (
		<div className="space-y-md rounded-xl border border-outline-variant bg-surface-container p-md md:col-span-5">
			<div className="flex items-center justify-between border-b border-outline-variant pb-xs">
				<p className="font-sans text-[10px] uppercase text-on-surface-variant">
					Audience Segments
				</p>
				<span className="material-symbols-outlined text-[16px] text-on-surface-variant">
					groups
				</span>
			</div>
			<div
				className="h-44 w-full"
				ref={chartRef}
			/>
			<div className="space-y-3">
				<SplitBar
					label="Anonymous"
					total={results.summary.totalResponses}
					value={results.summary.anonymousResponses}
				/>
				<SplitBar
					label="Authenticated"
					total={results.summary.totalResponses}
					value={results.summary.authenticatedResponses}
				/>
				<div className="border-t border-outline-variant pt-2">
					<p className="mb-2 font-sans text-[11px] text-on-surface-variant">
						Response Mode
					</p>
					<div className="flex gap-2">
						<div className="flex-1 rounded border border-outline-variant/50 bg-surface-container-high p-2 text-center">
							<p className="font-sans font-bold text-primary">
								{results.poll.responseMode === "authenticated"
									? "Verified"
									: "Open"}
							</p>
							<p className="text-[9px] uppercase text-on-surface-variant">
								Mode
							</p>
						</div>
						<div className="flex-1 rounded border border-outline-variant/50 bg-surface-container-high p-2 text-center">
							<p className="font-sans font-bold text-primary">
								{results.questions.length}
							</p>
							<p className="text-[9px] uppercase text-on-surface-variant">
								Questions
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
export default AudienceSegmentsPanel;
