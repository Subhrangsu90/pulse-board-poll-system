type ReviewPublishStepProps = {
	pollId: string | null;
};

export function ReviewPublishStep({ pollId }: ReviewPublishStepProps) {
	return (
		<section className="rounded-xl border border-outline-variant bg-surface-container p-xl">
			<p className="font-sans text-label-lg text-primary">Review</p>
			<h3 className="font-serif text-headline-md text-on-surface">
				Final review will live here.
			</h3>
			<p className="mt-sm font-sans text-body-lg text-on-surface-variant">
				Poll draft id: {pollId ?? "not created yet"}. Publishing can be wired
				once the server publish route is implemented.
			</p>
		</section>
	);
}
