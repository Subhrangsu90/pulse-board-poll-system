import type { HTMLAttributes } from "react";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={`animate-pulse rounded bg-surface-container-highest/60 ${className || ""}`}
			{...props}
		/>
	);
}
