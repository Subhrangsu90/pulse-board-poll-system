type QuestionsConfigurationStepProps = {
	pollId: string | null;
};

export function QuestionsConfigurationStep({
	pollId,
}: QuestionsConfigurationStepProps) {
	return (
		<section className="rounded-xl border border-outline-variant bg-surface-container p-xl">
			<p className="font-sans text-label-lg text-primary">Questions</p>
			<h3 className="font-serif text-headline-md text-on-surface">
				Questions and configuration will live here.
			</h3>
			<p className="mt-sm font-sans text-body-lg text-on-surface-variant">
				Poll draft id: {pollId ?? "not created yet"}. This step will later
				call question routes such as <code>POST /polls/:id/questions</code>.
			</p>
		</section>
	);
}
