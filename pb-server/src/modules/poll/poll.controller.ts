import type { Request, Response } from "express";
import { badRequest, unauthorized } from "../../common/utils/api.error";
import { created, ok } from "../../common/utils/api.response";
import { parseSchema } from "../../common/utils/validation";
import { createPollBodySchema, updatePollBodySchema } from "./dto/polls.dto";
import { questionSchema } from "./dto/questions.dto";
import * as pollService from "./poll.service";

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

export {
	addQuestionToPoll,
	completePoll,
	createPolls,
	deleteQuestion,
	deletePoll,
	getAllPolls,
	getPollById,
	publishPoll,
	updateQuestion,
	updatePoll,
};
