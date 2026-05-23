import { BrandLogo } from "../BrandLogo";

export function Footer() {
	return (
		<footer className="w-full py-xl px-margin flex flex-col md:flex-row justify-between items-center gap-md border-t border-outline-variant bg-surface-container-lowest">
			<div className="flex flex-col items-center gap-xs">
				<BrandLogo
					className="h-6 w-6"
					textClassName="font-serif text-title-lg text-primary"
				/>
				<p className="font-sans text-body-md text-on-surface-variant">
					© 2024 Votyx. Curated for focus.
				</p>
			</div>
			<div className="flex flex-wrap justify-center gap-lg">
				<a
					className="font-sans text-body-md text-on-surface-variant hover:text-primary transition-colors"
					href="#">
					Privacy Policy
				</a>
				<a
					className="font-sans text-body-md text-on-surface-variant hover:text-primary transition-colors"
					href="#">
					Terms of Service
				</a>
				<a
					className="font-sans text-body-md text-on-surface-variant hover:text-primary transition-colors"
					href="#">
					Digital Mindfulness Manifesto
				</a>
			</div>
		</footer>
	);
}
