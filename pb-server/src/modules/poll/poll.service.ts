import { randomUUID } from "node:crypto";
import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "../../common/config/db";
import { badRequest, notFound } from "../../common/utils/api.error";
import { polls } from "./dto/polls.dto";
import { CreatePollInput } from "./model/poll.type";

const responseModes = ["anonymous", "authenticated"] as const;

function normalizeTags(tags: unknown): string[] {
	if (tags === undefined) return [];

	if (!Array.isArray(tags)) {
		throw badRequest("Tags must be an array of strings.");
	}

	return tags
		.map((tag) => {
			if (typeof tag !== "string") {
				throw badRequest("Tags must be an array of strings.");
			}

			return tag.trim();
		})
		.filter(Boolean);
}

function normalizeExpiresAt(value: unknown): Date {
	if (typeof value !== "string" && !(value instanceof Date)) {
		throw badRequest("expiresAt is required.");
	}

	const expiresAt = new Date(value);

	if (Number.isNaN(expiresAt.getTime())) {
		throw badRequest("expiresAt must be a valid date.");
	}

	if (expiresAt <= new Date()) {
		throw badRequest("expiresAt must be in the future.");
	}

	return expiresAt;
}

function normalizePublicSlug(value: unknown): string {
	if (value !== undefined) {
		if (typeof value !== "string") {
			throw badRequest("Slug must be a string.");
		}

		const slug = value.trim();
		if (slug) return slug;
	}

	return randomUUID();
}

const createPoll = async (input: CreatePollInput) => {
	if (typeof input.title !== "string" || !input.title.trim()) {
		throw badRequest("Title is required.");
	}

	if (
		typeof input.responseMode !== "string" ||
		!responseModes.includes(input.responseMode as (typeof responseModes)[number])
	) {
		throw badRequest("responseMode must be anonymous or authenticated.");
	}

	if (input.description !== undefined && typeof input.description !== "string") {
		throw badRequest("Description must be a string.");
	}

	if (input.isPublished !== undefined && typeof input.isPublished !== "boolean") {
		throw badRequest("isPublished must be a boolean.");
	}

	const [createdPoll] = await db
		.insert(polls)
		.values({
			creatorId: input.creatorId,
			title: input.title.trim(),
			description: input.description?.trim() || null,
			tags: normalizeTags(input.tags),
			responseMode: input.responseMode as (typeof responseModes)[number],
			expiresAt: normalizeExpiresAt(input.expiresAt),
			isPublished: input.isPublished ?? false,
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
