type ResponseModeButtonProps = {
	isActive: boolean;
	label: string;
	onClick: () => void;
};

export function ResponseModeButton({
	isActive,
	label,
	onClick,
}: ResponseModeButtonProps) {
	return (
		<button
			className={`flex-1 rounded-full px-4 py-2 font-sans text-label-md transition-all ${
				isActive
					? "scale-[0.98] bg-primary-container text-on-primary-container"
					: "text-on-surface-variant hover:bg-surface-container-high"
			}`}
			onClick={onClick}
			type="button">
			{label}
		</button>
	);
}
