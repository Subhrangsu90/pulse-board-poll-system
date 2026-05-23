import { formatDateTime } from "../../utils/resultHelpers";
import type { PollResults } from "../../services/api/pollService";

export interface SubmissionLogProps {
	responses: PollResults["recentResponses"];
	onExport: () => void;
}

export function SubmissionLog({ responses, onExport }: SubmissionLogProps) {
	return (
		<section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
			<div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-md py-lg">
				<div>
					<h3 className="font-serif text-title-lg">
						Verified Submission Log
					</h3>
					<p className="font-sans text-label-md text-on-surface-variant">
						Real-time curation feed
					</p>
				</div>
				<button
					className="flex items-center gap-2 rounded-full bg-primary px-lg py-sm font-sans text-xs text-on-primary transition-all hover:opacity-90"
					onClick={onExport}
					type="button">
					<span className="material-symbols-outlined text-[18px]">
						download
					</span>
					Export
				</button>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full border-collapse text-left">
					<thead>
						<tr className="border-b border-outline-variant bg-surface-container-high">
							<th className="px-md py-sm font-sans text-on-surface-variant">
								Time
							</th>
							<th className="px-md py-sm font-sans text-on-surface-variant">
								Segment
							</th>
							<th className="px-md py-sm font-sans text-on-surface-variant">
								Response
							</th>
							<th className="px-md py-sm font-sans text-on-surface-variant">
								Status
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-outline-variant">
						{responses.length === 0 ? (
							<tr>
								<td
									className="px-md py-md font-sans text-on-surface-variant"
									colSpan={4}>
									No submissions yet.
								</td>
							</tr>
						) : (
							responses.map((response) => (
								<tr
									className="transition-colors hover:bg-surface-container-low"
									key={response.id}>
									<td className="whitespace-nowrap px-md py-md font-sans text-xs text-on-surface-variant">
										{formatDateTime(response.submittedAt)}
									</td>
									<td className="px-md py-md">
										<span className="rounded-full bg-outline-variant/30 px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
											{response.isAnonymous
												? "Anonymous"
												: "Verified"}
										</span>
									</td>
									<td className="px-md py-md font-sans text-xs italic text-on-surface">
										{response.answerCount} answer
										{response.answerCount === 1
											? ""
											: "s"}{" "}
										recorded
									</td>
									<td className="px-md py-md">
										<span className="rounded-full bg-secondary-container px-2 py-1 text-[9px] font-bold uppercase text-on-secondary-container">
											{response.status}
										</span>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</section>
	);
}
export default SubmissionLog;
