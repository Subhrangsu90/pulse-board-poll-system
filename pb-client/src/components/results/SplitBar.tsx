export interface SplitBarProps {
	label: string;
	total: number;
	value: number;
}

export function SplitBar({ label, total, value }: SplitBarProps) {
	const percentage = total === 0 ? 0 : Math.round((value / total) * 100);

	return (
		<div className="space-y-xs">
			<div className="flex items-center justify-between gap-md font-sans text-label-lg">
				<span>{label}</span>
				<span className="text-primary">
					{value} ({percentage}%)
				</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
				<div
					className="h-full rounded-full bg-secondary-container"
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	);
}
