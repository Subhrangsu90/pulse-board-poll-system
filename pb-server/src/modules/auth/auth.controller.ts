import type { Request, Response } from "express";
import { badRequest, internal, unauthorized } from "../../common/utils/api.error";
import { clearCookie, setCookie } from "../../common/utils/auth.utils";
import { env } from "../../config/env";
import * as authService from "./auth.service";
import { ok } from "../../common/utils/api.response";

const loginUser = async (req: Request, res: Response) => {
	if (!env.oidcClientId || !env.oidcClientSecret) {
		return internal("OIDC client credentials are not configured.");
	}

	const { loginUrl, state } = authService.createLoginUrl(req);
	const returnTo = authService.getReturnToFromRequest(req);

	setCookie(res, req, authService.STATE_COOKIE_NAME, state, 10 * 60);
	setCookie(res, req, authService.RETURN_TO_COOKIE_NAME, returnTo, 10 * 60);

	return res.redirect(loginUrl.toString());
};

const registerUser = async (req: Request, res: Response) => {
	if (!env.oidcClientId || !env.oidcClientSecret) {
		return internal("OIDC client credentials are not configured.");
	}

	const { registerUrl, state } = authService.createRegisterUrl(req);
	const returnTo = authService.getReturnToFromRequest(req);

	setCookie(res, req, authService.STATE_COOKIE_NAME, state, 10 * 60);
	setCookie(res, req, authService.RETURN_TO_COOKIE_NAME, returnTo, 10 * 60);

	return res.redirect(registerUrl.toString());
};

const handleCallback = async (req: Request, res: Response) => {
	try {
		const { code, state } = req.query;
		const expectedState = authService.getStateToken(req);

		if (!code || typeof code !== "string") {
			return badRequest("Missing authorization code.");
		}

		if (!state || typeof state !== "string" || state !== expectedState) {
			return badRequest("Invalid login state.");
		}

		const tokenResponse = await authService.exchangeCodeForToken(req, code);
		await authService.persistUserFromToken(tokenResponse.access_token);

		setCookie(
			res,
			req,
			authService.AUTH_COOKIE_NAME,
			tokenResponse.access_token,
			tokenResponse.expires_in
		);
		const returnTo = authService.getReturnToToken(req);

		clearCookie(res, req, authService.STATE_COOKIE_NAME);
		clearCookie(res, req, authService.RETURN_TO_COOKIE_NAME);

		return res.redirect(authService.getClientRedirectUrl(returnTo));
	} catch {
		return internal("Unable to complete login.");
	}
};

const getCurrentUser = async (req: Request, res: Response) => {
	try {
		const user = await authService.fetchCurrentUser(req);

		if (!user) {
			return unauthorized("Unauthorized", { authenticated: false });
		}

		return ok(res, "Logged in successfully", user);
	} catch {
		return res.status(500).json({
			message: "Unable to load current user.",
		});
	}
};

const getOptionalCurrentUser = async (req: Request, res: Response) => {
	const user = await authService.fetchCurrentUser(req).catch(() => null);

	return ok(res, "Current user checked successfully", user);
};

const logoutUser = async (req: Request, res: Response) => {
	await authService.revokeToken(req);
	clearCookie(res, req, authService.AUTH_COOKIE_NAME);
	clearCookie(res, req, authService.STATE_COOKIE_NAME);
	clearCookie(res, req, authService.RETURN_TO_COOKIE_NAME);
	return ok(res, "Logged out successfully");
};

export { loginUser, registerUser, handleCallback, logoutUser, getCurrentUser, getOptionalCurrentUser };
