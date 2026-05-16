import type { Request, Response } from "express";
import { unauthorized } from "../../common/utils/api.error";
import { created } from "../../common/utils/api.response";
import * as pollService from "./poll.service";

const createPolls = async (req: Request, res: Response) => {
	if (!req.user?.id) {
		throw unauthorized("Authentication required.");
	}

	const poll = await pollService.createPoll({
		creatorId: req.user.id,
		...req.body,
	});

	return created(res, "Poll created successfully", poll);
};

export { createPolls };
