import type { ReactNode } from "react";

type DialogTone = "default" | "success" | "auth" | "error";

type DialogProps = {
	isOpen: boolean;
	title: string;
	description?: ReactNode;
	icon?: string;
	tone?: DialogTone;
	children?: ReactNode;
	actions?: ReactNode;
	onClose?: () => void;
	closeLabel?: string;
};

const toneClasses: Record<DialogTone, string> = {
	default: "bg-surface-container-high text-primary",
	success: "bg-primary-container text-on-primary-container",
	auth: "bg-secondary-container text-on-secondary-container",
	error: "bg-error-container text-on-error-container",
};

export function Dialog({
	isOpen,
	title,
	description,
	icon,
	tone = "default",
	children,
	actions,
	onClose,
	closeLabel = "Close dialog",
}: DialogProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-md py-xl backdrop-blur-sm">
			<div
				aria-labelledby="dialog-title"
				aria-modal="true"
				className="relative w-full max-w-[calc(100vw-(var(--space-margin)*2))] sm:max-w-[32rem] md:max-w-[32rem] max-h-[calc(100vh-(var(--space-xl)*2))] overflow-y-auto rounded-[28px] border border-outline-variant bg-surface-container p-lg text-on-surface shadow-xl"
				role="dialog">
				<div className="flex flex-col items-center gap-md">
					{icon ? (
						<div
							className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${toneClasses[tone]}`}>
							<span className="material-symbols-outlined text-[28px]">
								{icon}
							</span>
						</div>
					) : null}

					<div className="min-w-0 flex flex-col items-center flex-1">
						<div className="mb-xs flex items-start justify-between gap-md ">
							<h2
								className="font-serif text-title-lg text-primary"
								id="dialog-title">
								{title}
							</h2>
							{onClose ? (
								<button
									aria-label={closeLabel}
									className="absolute right-md top-md grid h-10 w-10 place-items-center rounded-full text-outline transition-colors hover:bg-surface-container-high hover:text-primary"
									onClick={onClose}
									type="button">
									<span className="material-symbols-outlined">
										close
									</span>
								</button>
							) : null}
						</div>

						{description ? (
							<div className="mb-lg text-center font-sans leading-relaxed text-on-surface-variant">
								{description}
							</div>
						) : null}

						{children}

						{actions ? (
							<div className="mt-lg flex flex-col gap-md md:flex-row md:items-center md:justify-end">
								{actions}
							</div>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
