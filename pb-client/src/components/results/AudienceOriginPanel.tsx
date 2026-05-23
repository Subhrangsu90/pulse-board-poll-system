import { useMemo } from "react";
import { useEChart, type EChartsOption } from "../../hooks/useEChart";
import { useThemeColors } from "../../hooks/useThemeColors";
import { aggregateAudienceRegions } from "../../utils/audienceRegion";
import { SplitBar } from "./SplitBar";
import type { PollResults } from "../../services/api/pollService";

export interface AudienceOriginPanelProps {
	results: PollResults;
}

export function AudienceOriginPanel({ results }: AudienceOriginPanelProps) {
	const regions = useMemo(
		() => aggregateAudienceRegions(results.summary.regions, 6),
		[results.summary.regions],
	);
	const totalRegions = regions.reduce(
		(total, region) => total + region.count,
		0,
	);
	const colors = useThemeColors();
	const chartOption = useMemo<EChartsOption>(
		() => ({
			color: [colors.primary],
			grid: { bottom: 24, left: 28, right: 8, top: 12 },
			tooltip: { trigger: "axis" },
			xAxis: {
				type: "category",
				axisLabel: { interval: 0, overflow: "truncate", width: 72 },
				data: regions.map((region) => region.region),
			},
			yAxis: { type: "value", minInterval: 1 },
			series: [
				{
					type: "bar",
					barMaxWidth: 36,
					data: regions.map((region) => region.count),
				},
			],
		}),
		[regions, colors.primary],
	);
	const chartRef = useEChart(chartOption);

	return (
		<div className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md md:col-span-7">
			<div className="flex items-center justify-between border-b border-outline-variant pb-xs">
				<p className="font-sans text-[10px] uppercase text-on-surface-variant">
					Live Audience Origin
				</p>
				<span className="material-symbols-outlined text-[16px] text-on-surface-variant">
					public
				</span>
			</div>
			<div className="flex flex-col items-center gap-lg">
				<div className="w-full space-y-4">
					{regions.length === 0 ? (
						<p className="rounded-lg bg-surface-container p-md font-sans text-on-surface-variant">
							Waiting for live viewers to join this poll.
						</p>
					) : (
						regions.map((region) => (
							<SplitBar
								key={region.region}
								label={region.region}
								total={totalRegions}
								value={region.count}
							/>
						))
					)}
				</div>
				<div className="flex min-h-[120px] w-full items-center justify-center rounded-lg bg-surface-container p-2">
					<div
						className="h-40 w-full"
						ref={chartRef}
					/>
				</div>
			</div>
		</div>
	);
}
export default AudienceOriginPanel;
