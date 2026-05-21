import { PollListView } from "../components/polls/PollListView";

export default function MyPolls() {
	return (
		<PollListView
			description="Manage drafts, live links, archive state, and exports."
			emptyDescription="Create a draft, add questions, and publish when ready."
			emptyTitle="No polls yet"
			title="My Polls"
		/>
	);
}
