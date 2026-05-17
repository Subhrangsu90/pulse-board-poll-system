type PagePlaceholderProps = {
	title: string;
	label: string;
	description: string;
	icon: string;
};

export function PagePlaceholder({
	title,
	label,
	description,
	icon,
}: PagePlaceholderProps) {
	return (
		<section className="space-y-xl">
			<div className="space-y-sm">
				<p className="font-sans text-label-lg text-primary">{label}</p>
				<h2 className="font-serif text-headline-lg text-on-background">
					{title}
				</h2>
				<p className="font-sans text-body-lg text-on-surface-variant max-w-2xl">
					{description}
				</p>
			</div>

			<div className="rounded-md border border-outline-variant bg-surface-container-lowest p-xl">
				<div className="flex items-center gap-md">
					<span className="material-symbols-outlined text-primary text-headline-lg">
						{icon}
					</span>
					<div>
						<p className="font-serif text-title-lg text-on-surface">{title}</p>
						<p className="font-sans text-body-md text-on-surface-variant">
							This page is ready for its feature content.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
