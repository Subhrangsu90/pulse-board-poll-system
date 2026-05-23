import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authService } from "../services/api/authService";
import { BrandLogo } from "../components/BrandLogo";

export default function Landing() {
	const navigate = useNavigate();
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);

	useEffect(() => {
		authService
			.getCurrentUser()
			.then(() => {
				void navigate({ to: "/dashboard", replace: true });
			})
			.catch(() => {
				setIsCheckingAuth(false);
			});
	}, [navigate]);

	if (isCheckingAuth) {
		return (
			<div className="grid min-h-screen place-items-center bg-background px-margin text-on-surface">
				<div className="flex flex-col items-center gap-md text-center">
					<BrandLogo
						className="h-16 w-16"
						showText={false}
					/>
					<div>
						<p className="font-serif text-headline-md text-primary">
							Votyx
						</p>
						<p className="font-sans text-body-md text-on-surface-variant">
							Checking your session
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<>
			<header
				id="top"
				className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface/95 backdrop-blur-md">
				<div className="mx-auto flex w-full max-w-7xl items-center justify-between px-margin py-md">
					<BrandLogo
						className="h-8 w-8"
						textClassName="font-serif text-title-lg font-bold text-primary"
					/>
					<nav className="hidden md:flex items-center gap-xl">
						<a
							className="text-primary font-bold border-b-2 border-primary pb-1 font-sans text-label-lg"
							href="#top">
							Home
						</a>
						<a
							className="text-on-surface-variant font-medium hover:text-primary transition-colors font-sans text-label-lg"
							href="#philosophy">
							Philosophy
						</a>
						<a
							className="text-on-surface-variant font-medium hover:text-primary transition-colors font-sans text-label-lg"
							href="#methodology">
							Methodology
						</a>
						<a
							className="text-on-surface-variant font-medium hover:text-primary transition-colors font-sans text-label-lg"
							href="#security">
							Security
						</a>
					</nav>
					<div className="flex items-center gap-md">
						<button
							className="rounded-full bg-primary px-md py-sm font-sans !text-label-lg text-on-primary transition-all duration-300 hover:bg-primary-container hover:text-on-primary-container active:scale-95"
							onClick={authService.login}>
							Login
						</button>
					</div>
				</div>
			</header>
			<main className="bg-surface text-on-surface">
				{/* <!-- Hero Section --> */}
				<section className="relative overflow-hidden pt-xl md:pt-32 pb-xl px-margin">
					<div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-xl items-center">
						<div className="z-10 space-y-md">
							<h1 className="font-serif text-display-lg text-on-surface leading-tight">
								Cultivate depth through mindful analytics.
							</h1>
							<p className="font-sans text-body-lg text-on-surface-variant max-w-[36rem]">
								Transform chaotic sentiment into structured
								wisdom with an editorial-first approach to
								feedback.
							</p>
							<div className="flex flex-wrap gap-md pt-sm">
								<button
									className="rounded-full bg-primary px-xl py-md font-sans !text-label-lg text-on-primary shadow-popover transition-all hover:bg-primary-container hover:text-on-primary-container active:scale-95"
									onClick={authService.login}>
									Login with BrewAuth
								</button>
								<button
									className="rounded-full border border-outline px-xl py-md font-sans !text-label-lg text-primary transition-all hover:bg-surface-container-low active:scale-95"
									onClick={authService.register}>
									Create Account
								</button>
							</div>
						</div>
						<div className="relative mt-12 md:mt-0">
							<div className="aspect-square overflow-hidden rounded-xl border border-outline-variant bg-surface-container-high shadow-popover">
								<img
									alt="A clean desk arranged for focused analytics work"
									className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
									src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNuI-_sRN5IZe6XEjEW2ad44opAX2Nvzy7I1VVf8GAqPzL4SlXfkwNRIvwawGfrfdT0P3LmhVzqomN2X51tnHLQhW-OhZtifMgYFltQ-CD1nHnp6Gx5hBNaDOY1hx37x4TL_gJ_1BL9NeimsPl1gxKjsP2B11YQAl6uv5771IxvjltARb6pvJ-HbdSfOA-KfFEZ1tdPs1DRKyk-06jGqM2o4bsrng9UgOEQa8hkRT9WDyG63nmq817y2Cy6z84zqm6tGVN_O_zPCKq"
								/>
							</div>
							{/* <!-- Decorative Element --> */}
							<div className="absolute -bottom-6 -left-6 p-xl bg-secondary-container rounded-xl hidden md:block">
								<span
									className="material-symbols-outlined text-on-secondary-container scale-150"
									data-icon="auto_awesome">
									auto_awesome
								</span>
							</div>
						</div>
					</div>
				</section>
				{/* <!-- Trusted By --> */}
				<section className="py-xl bg-surface-container-low">
					<div className="max-w-7xl mx-auto px-margin">
						<p className="text-center font-sans text-label-md text-outline uppercase tracking-[0.2em] mb-xl">
							Curated Partnerships
						</p>
						<div className="flex flex-wrap justify-center items-center gap-16 md:gap-32 opacity-60">
							<span className="font-serif text-title-lg font-bold text-on-surface-variant tracking-widest">
								LUMEN
							</span>
							<span className="font-serif text-title-lg font-bold text-on-surface-variant tracking-widest">
								ASPECT
							</span>
							<span className="font-serif text-title-lg font-bold text-on-surface-variant tracking-widest">
								FOUNDRY
							</span>
							<span className="font-serif text-title-lg font-bold text-on-surface-variant tracking-widest">
								ETHEREAL
							</span>
						</div>
					</div>
				</section>
				{/* <!-- Features Section (Bento Grid) --> */}
				<section
					id="philosophy"
					className="py-32 px-margin bg-surface">
					<div className="max-w-7xl mx-auto">
						<div className="text-center mb-24">
							<h2 className="font-serif text-headline-lg text-on-surface mb-md">
								Precision Crafted Features
							</h2>
							<div className="w-16 h-1 bg-primary mx-auto rounded-full"></div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
							{/* <!-- Feature 1 --> */}
							<div className="md:col-span-7 p-xl rounded-lg bg-surface-container border border-outline-variant hover:bg-surface-container-high transition-all duration-300 group">
								<div className="flex flex-col h-full justify-between">
									<div>
										<span
											className="material-symbols-outlined text-primary text-3xl mb-md"
											data-icon="edit_note">
											edit_note
										</span>
										<h3 className="font-serif text-headline-md text-on-surface mb-sm">
											Intentional Polling
										</h3>
										<p className="font-sans text-body-lg text-on-surface-variant max-w-[32rem]">
											Craft questions that invite
											reflection rather than reaction.
											Move beyond binary choices into the
											nuance of human experience.
										</p>
									</div>
									<div className="mt-xl aspect-video rounded-lg overflow-hidden border border-outline-variant bg-surface-container-highest">
										<img
											alt="A journal and pen used to draft thoughtful poll questions"
											className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
											src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtTvfEWr_06YXRlHgRN0EFImuTgE8Ao6Neer89HKlIFpX3U9xsbUxgUKfkDKalw_ffi-DRAC1CteE9S42bbofa0Mr7a6VYIq1Oxp0yxQGTt3-Mo1inBqJW5ZpcEPSlV0XPyLA9jzDLR2XL1CdvKTNhXv9S6ZectDhl5JNqXlcKwBVk5eiGCye7rCMHuERWT74AROzpvS2UYHDqkaaZn5hdgVvrsZ46QBAWeLilnE971W8LxI8bhPlOJcvs_jOHsjzlMbmYoiREYY67"
										/>
									</div>
								</div>
							</div>
							{/* <!-- Feature 2 --> */}
							<div className="md:col-span-5 p-xl rounded-lg bg-primary text-on-primary transition-all duration-300 hover:bg-primary-container hover:text-on-primary-container">
								<div className="flex flex-col h-full">
									<span
										className="material-symbols-outlined text-current text-3xl mb-md"
										data-icon="menu_book">
										menu_book
									</span>
									<h3 className="font-serif text-headline-md mb-sm">
										Editorial Reports
									</h3>
									<p className="font-sans text-body-lg opacity-90 mb-xl">
										Synthesized summaries that read like a
										literary journal, not a spreadsheet.
										Data storytelling elevated to art.
									</p>
									<div className="mt-auto p-md bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
										<div className="space-y-sm">
											<div className="h-2 w-3/4 bg-on-primary/30 rounded-full"></div>
											<div className="h-2 w-1/2 bg-on-primary/20 rounded-full"></div>
											<div className="h-2 w-2/3 bg-on-primary/30 rounded-full"></div>
										</div>
									</div>
								</div>
							</div>
							{/* <!-- Feature 3 --> */}
							<div
								id="security"
								className="md:col-span-12 p-xl rounded-lg bg-surface-container-low border border-outline-variant flex flex-col md:flex-row items-center gap-xl hover:bg-surface-container transition-all">
								<div className="flex-1">
									<span
										className="material-symbols-outlined text-secondary text-3xl mb-md"
										data-icon="verified_user">
										verified_user
									</span>
									<h3 className="font-serif text-headline-md text-on-surface mb-sm">
										OIDC Enterprise Security
									</h3>
									<p className="font-sans text-body-lg text-on-surface-variant">
										Sovereign data for sovereign minds. We
										provide top-tier encryption and
										decentralized authentication methods to
										ensure your intellectual capital remains
										strictly yours.
									</p>
								</div>
								<div className="flex gap-md">
									<div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center">
										<span
											className="material-symbols-outlined text-on-secondary-container"
											data-icon="fingerprint">
											fingerprint
										</span>
									</div>
									<div className="w-16 h-16 rounded-full bg-tertiary-container flex items-center justify-center">
										<span
											className="material-symbols-outlined text-on-tertiary-container"
											data-icon="key">
											key
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>
				{/* <!-- Step-by-Step Process --> */}
				<section
					id="methodology"
					className="py-32 px-margin bg-surface-container-low">
					<div className="max-w-7xl mx-auto">
						<div className="grid md:grid-cols-2 gap-xl mb-24">
							<h2 className="font-serif text-headline-lg text-on-surface">
								The Path to Insight
							</h2>
							<p className="font-sans text-body-lg text-on-surface-variant">
								Our methodology is a three-stage pilgrimage from
								raw data to profound understanding. We don't
								just measure; we reveal.
							</p>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
							{/* <!-- Step 1 --> */}
							<div className="relative group">
								<div className="mb-md font-serif text-display-lg text-primary/30 group-hover:text-primary transition-colors duration-500">
									01
								</div>
								<h4 className="font-serif text-title-lg text-on-surface mb-sm font-bold">
									Craft
								</h4>
								<p className="font-sans text-body-md text-on-surface-variant">
									Design your inquiry with our mindful editor.
									Focus on the questions that truly matter for
									your organization's growth.
								</p>
							</div>
							{/* <!-- Step 2 --> */}
							<div className="relative group">
								<div className="mb-md font-serif text-display-lg text-primary/30 group-hover:text-primary transition-colors duration-500">
									02
								</div>
								<h4 className="font-serif text-title-lg text-on-surface mb-sm font-bold">
									Gather
								</h4>
								<p className="font-sans text-body-md text-on-surface-variant">
									Collect authentic responses through a
									focused, distraction-free interface that
									respects your audience's time.
								</p>
							</div>
							{/* <!-- Step 3 --> */}
							<div className="relative group">
								<div className="mb-md font-serif text-display-lg text-primary/30 group-hover:text-primary transition-colors duration-500">
									03
								</div>
								<h4 className="font-serif text-title-lg text-on-surface mb-sm font-bold">
									Analyze
								</h4>
								<p className="font-sans text-body-md text-on-surface-variant">
									Reveal quiet signals in your data with
									advanced sentiment analytics and synthesized
									reporting.
								</p>
							</div>
						</div>
					</div>
				</section>
				{/* <!-- Final CTA --> */}
				<section className="py-32 px-margin">
					<div className="max-w-4xl mx-auto p-xl md:p-32 rounded-xl bg-inverse-surface text-inverse-on-surface text-center relative overflow-hidden">
						{/* <!-- Background Texture --> */}
						<div className="absolute inset-0 opacity-10 pointer-events-none"></div>
						<div className="relative z-10">
							<h2 className="font-serif text-display-lg mb-md">
								Ready to listen more deeply?
							</h2>
							<p className="font-sans text-body-lg opacity-80 mb-xl max-w-[36rem] mx-auto">
								Join the vanguard of organizations prioritizing
								focus and depth in their analytical endeavors.
							</p>
							<button
								className="inline-flex rounded-full bg-primary px-xl py-md font-sans !text-label-lg text-on-primary transition-all duration-300 hover:bg-primary-container hover:text-on-primary-container active:scale-95"
								onClick={authService.login}>
								Login with BrewAuth
							</button>
							<p className="mt-md font-sans text-label-md opacity-50">
								Enterprise grade security. Privacy by design.
							</p>
						</div>
					</div>
				</section>
			</main>
			{/* <!-- Footer --> */}
			<footer className="w-full  border-t border-outline-variant bg-surface-container-highest dark:bg-surface/95">
				<div className="w-full px-margin py-xl flex flex-col md:flex-row justify-between items-center gap-md max-w-7xl mx-auto">
					<div className="flex flex-col items-center md:items-start gap-sm">
						<BrandLogo
							className="h-6 w-6"
							textClassName="font-serif text-title-lg text-primary font-bold"
						/>
						<p className="font-sans text-body-md text-on-surface-variant">
							Architecting Digital Mindfulness.
						</p>
					</div>
					<div className="flex flex-wrap justify-center gap-xl">
						<a
							className="font-sans text-label-md text-on-surface-variant hover:text-primary hover:underline decoration-primary/30 underline-offset-4 transition-colors"
							href="#philosophy">
							Philosophy
						</a>
						<a
							className="font-sans text-label-md text-on-surface-variant hover:text-primary hover:underline decoration-primary/30 underline-offset-4 transition-colors"
							href="#methodology">
							Methodology
						</a>
						<a
							className="font-sans text-label-md text-on-surface-variant hover:text-primary hover:underline decoration-primary/30 underline-offset-4 transition-colors"
							href="#security">
							Security
						</a>
						<button
							className="font-sans !text-label-md text-on-surface-variant hover:text-primary hover:underline decoration-primary/30 underline-offset-4 transition-colors"
							onClick={authService.register}>
							Register
						</button>
					</div>
					<div className="text-on-surface-variant font-sans text-label-md opacity-70">
						© 2026 Votyx.
					</div>
				</div>
			</footer>
		</>
	);
}
