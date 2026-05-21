import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { badRequest, unauthorized } from "../../common/utils/api.error";
import { created, ok } from "../../common/utils/api.response";
import { parseCookies, setCookie } from "../../common/utils/auth.utils";
import { parseSchema } from "../../common/utils/validation";
import { fetchCurrentUser } from "../auth/auth.service";
import { createPollBodySchema, updatePollBodySchema } from "./dto/polls.dto";
import { questionSchema } from "./dto/questions.dto";
import { submitPollResponseBodySchema } from "./dto/responses.dto";
import * as pollService from "./poll.service";
import { createDeviceFingerprint } from "./realtime/duplicate-vote.service";

function getPollId(req: Request) {
	const { pollId } = req.params;

	if (!pollId || Array.isArray(pollId)) {
		throw badRequest("Poll id is required.");
	}

	return pollId;
}

function getQuestionId(req: Request) {
	const { questionId } = req.params;

	if (!questionId || Array.isArray(questionId)) {
		throw badRequest("Question id is required.");
	}

	return questionId;
}

function getPublicSlug(req: Request) {
	const { slug } = req.params;

	if (!slug || Array.isArray(slug)) {
		throw badRequest("Poll slug is required.");
	}

	return slug;
}

function getAnonymousResponseCookieName(publicSlug: string) {
	return `pb_poll_${publicSlug.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80)}`;
}

function getRequestIp(req: Request) {
	const forwardedFor = req.get("x-forwarded-for");

	if (forwardedFor) {
		return forwardedFor.split(",")[0]?.trim() ?? null;
	}

	return req.ip ?? null;
}

const createPolls = async (req: Request, res: Response) => {
	if (!req.user?.id) {
		throw unauthorized("Authentication required.");
	}

	const poll = await pollService.createPoll({
		creatorId: req.user.id,
		...parseSchema(createPollBodySchema, req.body),
	});

	return created(res, "Poll created successfully", poll);
};

const completePoll = async (req: Request, res: Response) => {
	if (!req.user?.id) {
		throw unauthorized("Authentication required.");
	}

	const poll = await pollService.completePoll(getPollId(req), req.user.id);

	return ok(res, "Poll completed successfully", poll);
};

const getPollById = async (req: Request, res: Response) => {
	if (!req.user?.id) {
		throw unauthorized("Authentication required.");
	}

	const poll = await pollService.getPollById(getPollId(req), req.user.id);

	return ok(res, "Poll fetched successfully", poll);
};

const getPollResults = async (req: Request, res: Response) => {
	if (!req.user?.id) {
		throw unauthorized("Authentication required.");
	}

	const results = await pollService.getPollResults(getPollId(req), req.user.id);

	return ok(res, "Poll results fetched successfully", results);
};

const getPublicPollBySlug = async (req: Request, res: Response) => {
	const poll = await pollService.getPublicPollBySlug(getPublicSlug(req));

	return ok(res, "Public poll fetched successfully", poll);
};

const submitPublicPollResponse = async (req: Request, res: Response) => {
	const publicSlug = getPublicSlug(req);
	const cookieName = getAnonymousResponseCookieName(publicSlug);
	const cookies = parseCookies(req);
	const anonymousIdentifier = cookies[cookieName] ?? randomUUID();
	const user = await fetchCurrentUser(req).catch(() => null);
	const ipAddress = getRequestIp(req);
	const deviceFingerprint = createDeviceFingerprint({
		userId: user?.id ?? null,
		anonymousIdentifier,
		ipAddress,
		userAgent: req.get("user-agent"),
		deviceFingerprint: req.get("x-device-fingerprint"),
	});

	const response = await pollService.submitPublicPollResponse({
		publicSlug,
		userId: user?.id ?? null,
		anonymousIdentifier,
		ipAddress,
		deviceFingerprint,
		...parseSchema(submitPollResponseBodySchema, req.body),
	});

	if (response.isAnonymous) {
		setCookie(res, req, cookieName, anonymousIdentifier, 60 * 60 * 24 * 365);
	}

	return created(res, "Response submitted successfully", response);
};

const getPublicPollLiveMetrics = async (req: Request, res: Response) => {
	const metrics = await pollService.getPublicPollLiveMetrics(getPublicSlug(req));

	return ok(res, "Live poll metrics fetched successfully", metrics);
};

const getPublicPollResults = async (req: Request, res: Response) => {
	const results = await pollService.getPublicPollResultsBySlug(getPublicSlug(req));

	return ok(res, "Public poll results fetched successfully", results);
};

const getVoteQueueHealth = async (_req: Request, res: Response) => {
	const health = await pollService.getVoteQueueHealth();

	return ok(res, "Vote queue is healthy", health);
};

const updatePoll = async (req: Request, res: Response) => {
	if (!req.user?.id) {
		throw unauthorized("Authentication required.");
	}

	const poll = await pollService.updatePoll({
		creatorId: req.user.id,
		pollId: getPollId(req),
		...parseSchema(updatePollBodySchema, req.body),
	});

	return ok(res, "Poll updated successfully", poll);
};

const updateQuestion = async (req: Request, res: Response) => {
	if (!req.user?.id) {
		throw unauthorized("Authentication required.");
	}

	const question = await pollService.updateQuestion(
		getQuestionId(req),
		req.user.id,
		parseSchema(questionSchema, req.body)
	);

	return ok(res, "Question updated successfully", question);
};

const deleteQuestion = async (req: Request, res: Response) => {
	if (!req.user?.id) {
		throw unauthorized("Authentication required.");
	}

	const question = await pollService.deleteQuestion(getQuestionId(req), req.user.id);

	return ok(res, "Question deleted successfully", question);
};

const deletePoll = async (req: Request, res: Response) => {
	if (!req.user?.id) {
		throw unauthorized("Authentication required.");
	}

	const poll = await pollService.deletePoll(getPollId(req), req.user.id);

	return ok(res, "Poll deleted successfully", poll);
};

const publishPoll = async (req: Request, res: Response) => {
	if (!req.user?.id) {
		throw unauthorized("Authentication required.");
	}

	const poll = await pollService.publishPoll(getPollId(req), req.user.id);

	return ok(res, "Poll published successfully", poll);
};

const addQuestionToPoll = async (req: Request, res: Response) => {
	if (!req.user?.id) {
		throw unauthorized("Authentication required.");
	}

	const question = await pollService.addQuestionToPoll(
		getPollId(req),
		req.user.id,
		parseSchema(questionSchema, req.body)
	);

	return created(res, "Question added successfully", question);
};

const getAllPolls = async (req: Request, res: Response) => {
	if (!req.user?.id) {
		throw unauthorized("Authentication required.");
	}

	const polls = await pollService.getAllPolls(req.user.id);

	return ok(res, "Polls fetched successfully", polls);
};

const getPollsSummary = async (req: Request, res: Response) => {
	if (!req.user?.id) {
		throw unauthorized("Authentication required.");
	}

	const summary = await pollService.getPollsSummary(req.user.id);

	return ok(res, "Poll summary fetched successfully", summary);
};

export {
	addQuestionToPoll,
	completePoll,
	createPolls,
	deleteQuestion,
	deletePoll,
	getAllPolls,
	getPollsSummary,
	getPollById,
	getPollResults,
	getPublicPollLiveMetrics,
	getPublicPollResults,
	getVoteQueueHealth,
	getPublicPollBySlug,
	publishPoll,
	submitPublicPollResponse,
	updateQuestion,
	updatePoll,
};
