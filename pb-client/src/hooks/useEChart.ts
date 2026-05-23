import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import {
	BarChart,
	LineChart,
	PieChart,
	type BarSeriesOption,
	type LineSeriesOption,
	type PieSeriesOption,
} from "echarts/charts";
import {
	GridComponent,
	LegendComponent,
	TooltipComponent,
	type GridComponentOption,
	type LegendComponentOption,
	type TooltipComponentOption,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
	BarChart,
	CanvasRenderer,
	GridComponent,
	LegendComponent,
	LineChart,
	PieChart,
	TooltipComponent,
]);

export type EChartsOption = echarts.ComposeOption<
	| BarSeriesOption
	| GridComponentOption
	| LegendComponentOption
	| LineSeriesOption
	| PieSeriesOption
	| TooltipComponentOption
>;

export function useEChart(option: EChartsOption) {
	const chartRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!chartRef.current) return;

		const chart = echarts.init(chartRef.current);
		chart.setOption(option);

		const handleResize = () => chart.resize();
		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
			chart.dispose();
		};
	}, [option]);

	return chartRef;
}
export { echarts };
