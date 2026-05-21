import { PollListView } from "../components/polls/PollListView";

export default function Drafts() {
	return (
		<PollListView
			description="Pick up unfinished polls, refine questions, and publish when ready."
			emptyDescription="Start a new poll and save it as a draft to see it here."
			emptyTitle="No drafts yet"
			showStatusSort={false}
			statusFilter="draft"
			title="Draft polls"
		/>
	);
}
