import React from "react";

interface BrandLogoProps {
	className?: string;
	showText?: boolean;
	textClassName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
	className = "h-6 w-6",
	showText = true,
	textClassName = "font-serif text-headline-lg font-bold text-[#9dd3aa]",
}) => {
	return (
		<div className="flex items-center gap-2">
			<svg
				className={`shrink-0 ${className}`}
				viewBox="0 0 48 48"
				fill="none"
				xmlns="http://www.w3.org/2000/svg">
				{/* Background */}
				<rect
					x="3"
					y="3"
					width="42"
					height="42"
					rx="12"
					stroke="#9dd3aa"
					strokeWidth="3"
				/>

				{/* Analytics bars */}
				<rect
					x="13"
					y="24"
					width="5"
					height="11"
					rx="2.5"
					fill="#9dd3aa"
				/>

				<rect
					x="21.5"
					y="18"
					width="5"
					height="17"
					rx="2.5"
					fill="#9dd3aa"
				/>

				<rect
					x="30"
					y="12"
					width="5"
					height="23"
					rx="2.5"
					fill="#9dd3aa"
				/>

				{/* Voting check */}
				<path
					d="M13 15L18 20L27 11"
					stroke="#9dd3aa"
					strokeWidth="2.8"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>

				{/* Live indicator */}
				<circle
					cx="35"
					cy="12"
					r="2.5"
					fill="#9dd3aa"
				/>
			</svg>

			{showText && (
				<span className={textClassName}>
					Voty<span className="text-[#9dd3aa]">x</span>
				</span>
			)}
		</div>
	);
};
