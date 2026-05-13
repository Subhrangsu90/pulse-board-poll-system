import type { RequestHandler } from "express";
import { unauthorized } from "../../common/utils/api.error";
import { fetchCurrentUser } from "./auth.service";

export const requireAuth: RequestHandler = async (req, _res, next) => {
	try {
		const user = await fetchCurrentUser(req);

		if (!user) {
			return next(unauthorized("Authentication required."));
		}

		req.user = user;
		return next();
	} catch {
		return next(unauthorized("Authentication required."));
	}
};
