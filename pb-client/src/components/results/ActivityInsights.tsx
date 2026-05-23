import { useMemo } from "react";
import { useEChart, type EChartsOption } from "../../hooks/useEChart";
import { useThemeColors } from "../../hooks/useThemeColors";
import { formatDateTime } from "../../utils/resultHelpers";
import type { PollResults } from "../../services/api/pollService";

export interface ActivityInsightsProps {
	results: PollResults;
}

export function ActivityInsights({ results }: { results: PollResults }) {
	const colors = useThemeColors();
	const chartOption = useMemo<EChartsOption>(
		() => ({
			color: [colors.primary, colors.error],
			grid: { bottom: 24, left: 32, right: 12, top: 20 },
			tooltip: { trigger: "axis" },
			xAxis: {
				type: "category",
				boundaryGap: false,
				data: ["Start", "25%", "50%", "75%", "Now"],
			},
			yAxis: { type: "value", minInterval: 1 },
			series: [
				{
					type: "line",
					smooth: true,
					areaStyle: { opacity: 0.12 },
					data: [
						0,
						Math.max(
							0,
							Math.round(results.summary.totalResponses * 0.2),
						),
						Math.max(
							0,
							Math.round(results.summary.totalResponses * 0.45),
						),
						Math.max(
							0,
							Math.round(results.summary.totalResponses * 0.7),
						),
						results.summary.totalResponses,
					],
				},
			],
		}),
		[results.summary.totalResponses, colors.primary, colors.error],
	);
	const chartRef = useEChart(chartOption);

	return (
		<div className="space-y-md rounded-xl border border-outline-variant bg-surface-container p-md lg:col-span-7">
			<div className="flex items-center justify-between border-b border-outline-variant pb-sm">
				<div>
					<h3 className="font-serif text-title-lg">
						Participation Insights
					</h3>
					<p className="font-sans text-on-surface-variant">
						Active engagement trends
					</p>
				</div>
				<div className="text-right">
					<p className="font-sans text-[10px] uppercase text-on-surface-variant">
						Latest Activity
					</p>
					<p className="font-serif font-bold text-primary">
						{formatDateTime(results.summary.lastSubmittedAt)}
					</p>
				</div>
			</div>
			<div
				className="h-48 w-full rounded-lg bg-surface-container-low"
				ref={chartRef}
			/>
		</div>
	);
}
export default ActivityInsights;
