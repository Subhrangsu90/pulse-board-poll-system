import { useMemo } from "react";
import { useEChart, type EChartsOption } from "../../hooks/useEChart";
import { useThemeColors } from "../../hooks/useThemeColors";
import type { PollResults } from "../../services/api/pollService";

export interface QuestionResultCardProps {
	question: PollResults["questions"][number];
	questionIndex: number;
}

export function QuestionResultCard({
	question,
	questionIndex,
}: QuestionResultCardProps) {
	const colors = useThemeColors();
	const chartOption = useMemo<EChartsOption>(
		() => ({
			color: [colors.primary],
			grid: { bottom: 24, left: 32, right: 12, top: 8 },
			tooltip: { trigger: "axis" },
			xAxis: {
				type: "category",
				axisLabel: { interval: 0, overflow: "truncate", width: 90 },
				data: question.options.map((option) => option.optionText),
			},
			yAxis: { type: "value", minInterval: 1 },
			series: [
				{
					type: "bar",
					barMaxWidth: 42,
					data: question.options.map(
						(option) => option.selectionCount,
					),
				},
			],
		}),
		[question.options, colors.primary],
	);
	const chartRef = useEChart(chartOption);

	return (
		<article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
			<div className="mb-lg flex flex-col justify-between gap-md md:flex-row md:items-start">
				<div>
					<div className="mb-sm flex flex-wrap items-center gap-xs">
						<span className="rounded-full bg-secondary-container px-3 py-1 font-sans text-label-md text-on-secondary-container">
							Question {questionIndex + 1}
						</span>
						<span className="rounded-full bg-surface-container-high px-3 py-1 font-sans text-label-md text-on-surface-variant">
							{question.questionType === "multiple_choice"
								? "Multiple choice"
								: "Single choice"}
						</span>
						{question.isRequired ? (
							<span className="rounded-full bg-primary-container px-3 py-1 font-sans text-label-md text-on-primary-container">
								Required
							</span>
						) : null}
					</div>
					<h4 className="font-serif text-title-lg text-on-surface">
						{question.questionText}
					</h4>
				</div>
				<div className="rounded-lg bg-surface-container-low px-md py-sm text-right">
					<p className="font-sans text-label-md text-on-surface-variant">
						Responses
					</p>
					<p className="font-serif text-title-lg text-primary">
						{question.responseCount}
					</p>
				</div>
			</div>

			<div
				className="mb-lg h-56 w-full rounded-lg bg-surface-container-low"
				ref={chartRef}
			/>

			<div className="space-y-md">
				{question.options.map((option) => (
					<div
						className="space-y-xs"
						key={option.id}>
						<div className="flex items-center justify-between gap-md font-sans text-label-lg">
							<span className="min-w-0 break-words text-on-surface">
								{option.optionText}
							</span>
							<span className="shrink-0 text-primary">
								{option.selectionCount} ({option.percentage}%)
							</span>
						</div>
						<div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
							<div
								className="h-full rounded-full bg-primary-container"
								style={{ width: `${option.percentage}%` }}
							/>
						</div>
					</div>
				))}
			</div>
		</article>
	);
}
export default QuestionResultCard;
