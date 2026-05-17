import { randomUUID } from "node:crypto";
import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "../../common/config/db";
import { notFound } from "../../common/utils/api.error";
import { polls } from "./dto/polls.dto";
import type { CreatePollInput } from "./model/poll.type";

function normalizePublicSlug(value?: string): string {
	if (value !== undefined) {
		return value;
	}

	return randomUUID();
}

const createPoll = async (input: CreatePollInput) => {
	const [createdPoll] = await db
		.insert(polls)
		.values({
			creatorId: input.creatorId,
			title: input.title,
			description: input.description || null,
			tags: input.tags,
			responseMode: input.responseMode,
			expiresAt: input.expiresAt,
			isPublished: input.isPublished,
			status: input.isPublished ? "active" : "draft",
			publicSlug: normalizePublicSlug(input.publicSlug),
		})
		.returning();

	return createdPoll;
};

const completePoll = async (pollId: string, creatorId: string) => {
	const [completedPoll] = await db
		.update(polls)
		.set({
			status: "completed",
			isPublished: false,
			updatedAt: new Date(),
		})
		.where(and(eq(polls.id, pollId), eq(polls.creatorId, creatorId)))
		.returning();

	if (!completedPoll) {
		throw notFound("Poll not found.");
	}

	return completedPoll;
};

const expireDuePolls = async () => {
	return db
		.update(polls)
		.set({
			status: "expired",
			isPublished: false,
			updatedAt: new Date(),
		})
		.where(and(eq(polls.status, "active"), lte(polls.expiresAt, new Date())))
		.returning();
};

const getAllPolls = async (creatorId: string) => {
	await expireDuePolls();

	return db
		.select()
		.from(polls)
		.where(eq(polls.creatorId, creatorId))
		.orderBy(desc(polls.createdAt));
};

export { completePoll, createPoll, expireDuePolls, getAllPolls };
export type { CreatePollInput };
