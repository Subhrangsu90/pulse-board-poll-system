import type { Request, Response } from "express";
import { internal } from "../../common/utils/api.error";
import { setCookie } from "../../common/utils/auth.utils";
import { env } from "../../config/env";
import * as authService from "./auth.service";

const STATE_COOKIE_NAME = "pb_auth_state";

const loginUser = async (req: Request, res: Response) => {
	if (!env.oidcClientId || !env.oidcClientSecret) {
		throw internal("OIDC client credentials are not configured.");
	}

	const { loginUrl, state } = authService.createLoginUrl(req);

	setCookie(res, req, STATE_COOKIE_NAME, state, 10 * 60);

	return res.redirect(loginUrl.toString());
};

export { loginUser };
