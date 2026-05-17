import type { Request, Response } from "express";
import { badRequest, unauthorized } from "../../common/utils/api.error";
import { created, ok } from "../../common/utils/api.response";
import { parseSchema } from "../../common/utils/validation";
import { createPollBodySchema } from "./model/poll.type";
import * as pollService from "./poll.service";

function getPollId(req: Request) {
	const { pollId } = req.params;

	if (!pollId || Array.isArray(pollId)) {
		throw badRequest("Poll id is required.");
	}

	return pollId;
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

const getAllPolls = async (req: Request, res: Response) => {
	if (!req.user?.id) {
		throw unauthorized("Authentication required.");
	}

	const polls = await pollService.getAllPolls(req.user.id);

	return ok(res, "Polls fetched successfully", polls);
};

export { completePoll, createPolls, getAllPolls };
