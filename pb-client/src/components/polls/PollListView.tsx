import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useToast } from "../../components/toastContext";
import { getApiErrorMessage } from "../../services/api/apiService";
import {
	pollService,
	type Poll,
	type UpdatePollPayload,
} from "../../services/api/pollService";

export type PollListViewProps = {
	title: string;
	description: string;
	emptyTitle: string;
	emptyDescription: string;
	statusFilter?: Poll["status"];
	showStatusSort?: boolean;
};

type SortMode = "recent" | "status" | "expiry";

type EditForm = {
	title: string;
	description: string;
	tags: string;
	publicSlug: string;
	responseMode: "anonymous" | "authenticated";
	expiresAt: string;
};

function getStatusLabel(status: Poll["status"]) {
	if (status === "active") return "Active";
	if (status === "completed") return "Completed";
	if (status === "expired") return "Expired";
	return "Draft";
}

function getStatusClass(status: Poll["status"]) {
	if (status === "active")
		return "bg-primary-container text-on-primary-container";
	if (status === "completed")
		return "bg-surface-variant text-on-surface-variant";
	if (status === "expired")
		return "bg-error-container text-on-error-container";
	return "bg-tertiary-container text-on-tertiary-container";
}

function getPollLink(poll: Poll) {
	const slug = poll.publicSlug || poll.id;
	return `${window.location.origin}/public/poll/${slug}`;
}

function toLocalDateTimeInputValue(value: string) {
	const date = new Date(value);
	date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
	return date.toISOString().slice(0, 16);
}

function buildEditForm(poll: Poll): EditForm {
	return {
		title: poll.title,
		description: poll.description ?? "",
		tags: poll.tags.join(", "),
		publicSlug: poll.publicSlug ?? "",
		responseMode: poll.responseMode,
		expiresAt: toLocalDateTimeInputValue(poll.expiresAt),
	};
}

function downloadPoll(poll: Poll) {
	const blob = new Blob([JSON.stringify(poll, null, 2)], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${poll.publicSlug || poll.id}.json`;
	link.click();
	URL.revokeObjectURL(url);
}

export function PollListView({
	title,
	description,
	emptyTitle,
	emptyDescription,
	statusFilter,
	showStatusSort = true,
}: PollListViewProps) {
	const navigate = useNavigate();
	const toast = useToast();
	const queryClient = useQueryClient();

	const [sortMode, setSortMode] = useState<SortMode>("recent");
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
	const [editForm, setEditForm] = useState<EditForm | null>(null);

	const { data: polls = [], isLoading, error: queryError } = useQuery<Poll[]>({
		queryKey: ["polls"],
		queryFn: () => pollService.getAllPolls(),
	});

	const showError = useCallback(
		(message: string) => {
			setError(message);
			toast.error(message);
		},
		[toast],
	);

	useEffect(() => {
		if (queryError) {
			console.error("Unable to load polls:", queryError);
			showError(getApiErrorMessage(queryError, "Unable to load polls."));
		}
	}, [queryError, showError]);

	const filteredPolls = useMemo(() => {
		if (!statusFilter) return polls;
		return polls.filter((poll) => poll.status === statusFilter);
	}, [polls, statusFilter]);

	const sortedPolls = useMemo(() => {
		const nextPolls = [...filteredPolls];

		if (sortMode === "status" && showStatusSort) {
			return nextPolls.sort((a, b) =>
				getStatusLabel(a.status).localeCompare(
					getStatusLabel(b.status),
				),
			);
		}

		if (sortMode === "expiry") {
			return nextPolls.sort(
				(a, b) =>
					new Date(a.expiresAt).getTime() -
					new Date(b.expiresAt).getTime(),
			);
		}

		return nextPolls.sort(
			(a, b) =>
				new Date(b.createdAt ?? 0).getTime() -
				new Date(a.createdAt ?? 0).getTime(),
		);
	}, [filteredPolls, showStatusSort, sortMode]);

	const replacePoll = (poll: Poll) => {
		queryClient.setQueryData<Poll[]>(["polls"], (currentPolls) =>
			currentPolls ? currentPolls.map((c) => (c.id === poll.id ? poll : c)) : []
		);
		void queryClient.invalidateQueries({ queryKey: ["pollsSummary"] });
	};

	const copyPollLink = async (poll: Poll) => {
		try {
			await navigator.clipboard.writeText(getPollLink(poll));
			toast.success("Link copied.");
		} catch (copyError) {
			console.error("Unable to copy poll link:", copyError);
			showError("Unable to copy poll link.");
		}
	};

	const openEditDialog = (poll: Poll) => {
		setEditingPoll(poll);
		setEditForm(buildEditForm(poll));
	};

	const openFullEditor = (poll: Poll) => {
		void navigate({ to: `/polls/${poll.id}/edit` });
	};

	const openResults = (poll: Poll) => {
		window.location.href = `/results?pollId=${poll.id}`;
	};

	const closeEditDialog = () => {
		setEditingPoll(null);
		setEditForm(null);
	};

	const handleUpdatePoll = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!editingPoll || !editForm) return;

		setIsSaving(true);
		setError(null);

		const payload: UpdatePollPayload = {
			title: editForm.title.trim(),
			description: editForm.description.trim() || undefined,
			tags: editForm.tags
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean),
			publicSlug: editForm.publicSlug.trim() || undefined,
			responseMode: editForm.responseMode,
			expiresAt: new Date(editForm.expiresAt).toISOString(),
		};

		try {
			replacePoll(await pollService.updatePoll(editingPoll.id, payload));
			toast.success("Poll updated.");
			closeEditDialog();
		} catch (updateError) {
			console.error("Unable to update poll:", updateError);
			showError(
				getApiErrorMessage(updateError, "Unable to update poll."),
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handlePublishPoll = async (poll: Poll) => {
		setError(null);
		try {
			replacePoll(await pollService.publishPoll(poll.id));
			toast.success("Poll published.");
		} catch (publishError) {
			console.error("Unable to publish poll:", publishError);
			showError(
				getApiErrorMessage(
					publishError,
					"Unable to publish poll. Make sure it has questions and options.",
				),
			);
		}
	};

	const handleArchivePoll = async (poll: Poll) => {
		setError(null);
		try {
			replacePoll(await pollService.completePoll(poll.id));
			toast.success("Poll archived.");
		} catch (archiveError) {
			console.error("Unable to archive poll:", archiveError);
			showError(
				getApiErrorMessage(archiveError, "Unable to archive poll."),
			);
		}
	};

	const handleDeletePoll = async (poll: Poll) => {
		if (!window.confirm(`Delete "${poll.title}"? This cannot be undone.`))
			return;

		setError(null);
		try {
			await pollService.deletePoll(poll.id);
			queryClient.setQueryData<Poll[]>(["polls"], (currentPolls) =>
				currentPolls ? currentPolls.filter((c) => c.id !== poll.id) : []
			);
			void queryClient.invalidateQueries({ queryKey: ["pollsSummary"] });
			toast.success("Poll deleted.");
		} catch (deleteError) {
			console.error("Unable to delete poll:", deleteError);
			showError(
				getApiErrorMessage(deleteError, "Unable to delete poll."),
			);
		}
	};

	return (
		<>
			<div className="flex-1 space-y-gutter pb-32 md:pb-0">
				<header className="mb-xl flex flex-col justify-between gap-md md:flex-row md:items-end">
					<div>
						<h2 className="mb-xs font-serif text-headline-md font-Literata text-primary">
							{title}
						</h2>
						<p className="font-sans text-on-surface-variant">
							{description}
						</p>
					</div>
					<div className="flex items-center gap-sm">
						<span className="font-sans text-on-surface-variant">
							Sort by:
						</span>
						<select
							className="rounded-lg border-none bg-surface-container-low font-sans text-primary focus:ring-primary"
							onChange={(event) =>
								setSortMode(event.target.value as SortMode)
							}
							value={sortMode}>
							<option value="recent">Recent</option>
							<option value="expiry">Expiry</option>
							{showStatusSort ? (
								<option value="status">Status</option>
							) : null}
						</select>
					</div>
				</header>

				{error ? (
					<p className="rounded-md bg-error-container px-md py-sm font-sans text-on-error-container">
						{error}
					</p>
				) : null}

				{isLoading ? (
					<p className="rounded-xl border border-outline-variant bg-surface-container p-xl font-sans text-on-surface-variant">
						Loading polls...
					</p>
				) : null}

				{!isLoading && sortedPolls.length === 0 ? (
					<div className="rounded-xl border border-outline-variant bg-surface-container p-xl text-center">
						<h3 className="mb-sm font-serif text-title-lg text-primary">
							{emptyTitle}
						</h3>
						<p className="mb-lg font-sans text-on-surface-variant">
							{emptyDescription}
						</p>
						<button
							className="rounded-full bg-primary-container px-xl py-3 font-sans font-bold text-on-primary-container"
							onClick={() => void navigate({ to: "/create" })}
							type="button">
							Create Poll
						</button>
					</div>
				) : null}

				<div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
					{sortedPolls.map((poll) => (
						<article
							className="flex flex-col rounded-xl border border-outline-variant bg-surface-container p-md transition-colors hover:bg-surface-container-high"
							key={poll.id}>
							<div className="mb-md flex items-start justify-between gap-md">
								<span
									className={`rounded-full px-3 py-1 font-sans ${getStatusClass(poll.status)}`}>
									{getStatusLabel(poll.status)}
								</span>
								<button
									className="text-outline transition-colors hover:text-error"
									onClick={() => void handleDeletePoll(poll)}
									title="Delete poll"
									type="button">
									<span className="material-symbols-outlined">
										delete
									</span>
								</button>
							</div>

							<h3 className="mb-sm font-serif text-title-lg font-Literata leading-tight text-primary">
								{poll.title}
							</h3>
							<p className="mb-md line-clamp-2 font-sans text-on-surface-variant">
								{poll.description || "No description added."}
							</p>

							<div className="mb-lg space-y-xs font-sans text-on-surface-variant">
								<p>
									Expires{" "}
									{new Date(poll.expiresAt).toLocaleString()}
								</p>
								<p>
									{poll.responseMode === "authenticated"
										? "Authenticated"
										: "Anonymous"}
								</p>
								{poll.tags.length > 0 ? (
									<div className="flex flex-wrap gap-xs pt-xs">
										{poll.tags.map((tag) => (
											<span
												className="rounded-full bg-surface-container-lowest px-3 py-1"
												key={tag}>
												{tag}
											</span>
										))}
									</div>
								) : null}
							</div>

							<div className="mt-auto flex flex-wrap gap-sm">
								{poll.status === "draft" ? (
									<>
										<button
											className="flex items-center gap-xs rounded-full bg-primary-container px-4 py-2 font-sans text-on-primary-container"
											onClick={() => openFullEditor(poll)}
											type="button">
											<span className="material-symbols-outlined text-[18px]">
												edit
											</span>
											Edit
										</button>
										<button
											className="flex items-center gap-xs rounded-full bg-surface-container-lowest px-4 py-2 font-sans text-primary"
											onClick={() => openEditDialog(poll)}
											type="button">
											<span className="material-symbols-outlined text-[18px]">
												settings
											</span>
											Settings
										</button>
										<button
											className="flex items-center gap-xs rounded-full bg-surface-container-lowest px-4 py-2 font-sans text-primary"
											onClick={() =>
												void handlePublishPoll(poll)
											}
											type="button">
											<span className="material-symbols-outlined text-[18px]">
												publish
											</span>
											Publish
										</button>
									</>
								) : null}

								{poll.status === "active" ? (
									<>
										<button
											className="flex items-center gap-xs rounded-full bg-primary-container px-4 py-2 font-sans text-on-primary-container"
											onClick={() =>
												void copyPollLink(poll)
											}
											type="button">
											<span className="material-symbols-outlined text-[18px]">
												share
											</span>
											Link
										</button>
										<button
											className="flex items-center gap-xs rounded-full bg-surface-container-lowest px-4 py-2 font-sans text-primary"
											onClick={() => openResults(poll)}
											type="button">
											<span className="material-symbols-outlined text-[18px]">
												analytics
											</span>
											Results
										</button>
										<button
											className="flex items-center gap-xs rounded-full bg-surface-container-lowest px-4 py-2 font-sans text-primary"
											onClick={() =>
												void handleArchivePoll(poll)
											}
											type="button">
											<span className="material-symbols-outlined text-[18px]">
												archive
											</span>
											Archive
										</button>
									</>
								) : null}

								{poll.status === "completed" ||
								poll.status === "expired" ? (
									<>
										<button
											className="flex items-center gap-xs rounded-full bg-primary-container px-4 py-2 font-sans text-on-primary-container"
											onClick={() => openResults(poll)}
											type="button">
											<span className="material-symbols-outlined text-[18px]">
												visibility
											</span>
											Results
										</button>
										<button
											className="flex items-center gap-xs rounded-full bg-surface-container-lowest px-4 py-2 font-sans text-primary"
											onClick={() => downloadPoll(poll)}
											type="button">
											<span className="material-symbols-outlined text-[18px]">
												download
											</span>
											Download
										</button>
									</>
								) : null}

								{poll.status !== "completed" &&
								poll.status !== "expired" ? (
									<button
										className="flex items-center gap-xs rounded-full bg-surface-container-lowest px-4 py-2 font-sans text-primary"
										onClick={() => downloadPoll(poll)}
										type="button">
										<span className="material-symbols-outlined text-[18px]">
											download
										</span>
										Export
									</button>
								) : null}
							</div>
						</article>
					))}

					{/* <button
						className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-primary p-xl text-center text-on-primary transition-colors hover:bg-primary-container hover:text-on-primary-container"
						
						type="button">
						<span className="material-symbols-outlined mb-md text-[48px]">
							add
						</span>
						<span className="font-serif text-headline-md font-Literata">
							New Poll
						</span>
					</button> */}

					<div className="col-span-1 md:col-span-2 lg:col-span-1 bg-primary text-on-primary p-xl rounded-xl flex flex-col justify-center items-center text-center">
						<span className="material-symbols-outlined text-[48px] mb-md">
							auto_awesome
						</span>
						<h3 className="font-headline-md text-headline-md font-Literata mb-sm">
							Engage Your Focus
						</h3>
						<p className="font-body-md opacity-90 mb-lg">
							Your audience is waiting for your next thoughtful
							inquiry.
						</p>
						<button
							className="bg-primary-fixed text-on-primary-fixed font-label-lg px-xl py-3 rounded-full hover:bg-primary-fixed-dim transition-colors flex items-center gap-sm"
							onClick={() => void navigate({ to: "/create" })}
							type="button">
							<span className="material-symbols-outlined">
								add
							</span>
							New Poll
						</button>
					</div>
				</div>
			</div>

			<button
				className="fixed bottom-24 right-margin z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container shadow-lg transition-all hover:scale-105 active:scale-95 md:right-xl"
				onClick={() => void navigate({ to: "/create" })}
				type="button">
				<span className="material-symbols-outlined text-[32px]">
					add
				</span>
			</button>

			{editingPoll && editForm ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-md">
					<form
						className="w-full max-w-2xl rounded-xl border border-outline-variant bg-surface-container p-lg shadow-xl"
						onSubmit={handleUpdatePoll}>
						<div className="mb-lg flex items-start justify-between gap-md">
							<div>
								<h3 className="font-serif text-title-lg text-primary">
									Edit Poll
								</h3>
								<p className="font-sans text-on-surface-variant">
									Update poll details without changing
									questions.
								</p>
							</div>
							<button
								aria-label="Close edit dialog"
								className="rounded-full p-xs text-outline hover:bg-surface-container-high hover:text-primary"
								onClick={closeEditDialog}
								type="button">
								<span className="material-symbols-outlined">
									close
								</span>
							</button>
						</div>

						<div className="grid grid-cols-1 gap-md md:grid-cols-2">
							<label className="flex flex-col gap-xs font-sans text-primary md:col-span-2">
								Title
								<input
									className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm font-sans text-on-surface"
									onChange={(event) =>
										setEditForm({
											...editForm,
											title: event.target.value,
										})
									}
									value={editForm.title}
								/>
							</label>
							<label className="flex flex-col gap-xs font-sans text-primary md:col-span-2">
								Description
								<textarea
									className="min-h-24 rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm font-sans text-on-surface"
									onChange={(event) =>
										setEditForm({
											...editForm,
											description: event.target.value,
										})
									}
									value={editForm.description}
								/>
							</label>
							<label className="flex flex-col gap-xs font-sans text-primary">
								Tags
								<input
									className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm font-sans text-on-surface"
									onChange={(event) =>
										setEditForm({
											...editForm,
											tags: event.target.value,
										})
									}
									value={editForm.tags}
								/>
							</label>
							<label className="flex flex-col gap-xs font-sans text-primary">
								Public Slug
								<input
									className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm font-sans text-on-surface"
									onChange={(event) =>
										setEditForm({
											...editForm,
											publicSlug: event.target.value,
										})
									}
									value={editForm.publicSlug}
								/>
							</label>
							<label className="flex flex-col gap-xs font-sans text-primary">
								Response Mode
								<select
									className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm font-sans text-on-surface"
									onChange={(event) =>
										setEditForm({
											...editForm,
											responseMode: event.target
												.value as EditForm["responseMode"],
										})
									}
									value={editForm.responseMode}>
									<option value="anonymous">Anonymous</option>
									<option value="authenticated">
										Authenticated
									</option>
								</select>
							</label>
							<label className="flex flex-col gap-xs font-sans text-primary">
								Expires At
								<input
									className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm font-sans text-on-surface"
									onChange={(event) =>
										setEditForm({
											...editForm,
											expiresAt: event.target.value,
										})
									}
									type="datetime-local"
									value={editForm.expiresAt}
								/>
							</label>
						</div>

						<div className="mt-lg flex flex-col gap-md md:flex-row md:justify-end">
							<button
								className="rounded-full bg-surface-container-low px-6 py-3 font-sans font-bold text-primary"
								onClick={closeEditDialog}
								type="button">
								Cancel
							</button>
							<button
								className="rounded-full bg-primary-container px-6 py-3 font-sans font-bold text-on-primary-container disabled:cursor-not-allowed disabled:opacity-60"
								disabled={isSaving}
								type="submit">
								{isSaving ? "Saving..." : "Save Changes"}
							</button>
						</div>
					</form>
				</div>
			) : null}
		</>
	);
}
