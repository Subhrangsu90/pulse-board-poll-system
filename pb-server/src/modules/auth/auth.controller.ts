import type { Request, Response } from "express";
import { badRequest, internal, unauthorized } from "../../common/utils/api.error";
import { clearCookie, setCookie } from "../../common/utils/auth.utils";
import { env } from "../../config/env";
import * as authService from "./auth.service";
import { ok } from "../../common/utils/api.response";
import { parseSchema } from "../../common/utils/validation";
import { updateUserPreferencesSchema } from "./dto/preferences.dto";
import * as preferencesService from "./preferences.service";

const loginUser = async (req: Request, res: Response) => {
	if (!env.oidcClientId || !env.oidcClientSecret) {
		throw internal("OIDC client credentials are not configured.");
	}

	const { loginUrl, state } = authService.createLoginUrl(req);
	const returnTo = authService.getReturnToFromRequest(req);

	setCookie(res, req, authService.STATE_COOKIE_NAME, state, 10 * 60);
	setCookie(res, req, authService.RETURN_TO_COOKIE_NAME, returnTo, 10 * 60);

	return res.redirect(loginUrl.toString());
};

const registerUser = async (req: Request, res: Response) => {
	if (!env.oidcClientId || !env.oidcClientSecret) {
		throw internal("OIDC client credentials are not configured.");
	}

	const { registerUrl, state } = authService.createRegisterUrl(req);
	const returnTo = authService.getReturnToFromRequest(req);

	setCookie(res, req, authService.STATE_COOKIE_NAME, state, 10 * 60);
	setCookie(res, req, authService.RETURN_TO_COOKIE_NAME, returnTo, 10 * 60);

	return res.redirect(registerUrl.toString());
};

const handleCallback = async (req: Request, res: Response) => {
	const { code, state } = req.query;
	const expectedState = authService.getStateToken(req);

	if (!code || typeof code !== "string") {
		throw badRequest("Missing authorization code.");
	}

	if (!state || typeof state !== "string" || state !== expectedState) {
		throw badRequest("Invalid login state.");
	}

	try {
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
	} catch (error) {
		throw internal("Unable to complete login.");
	}
};

const getCurrentUser = async (req: Request, res: Response) => {
	try {
		const user = await authService.fetchCurrentUser(req);

		if (!user) {
			throw unauthorized("Unauthorized", { authenticated: false });
		}

		return ok(res, "Logged in successfully", user);
	} catch (error) {
		if (error instanceof Error && (error as any).statusCode === 401) {
			throw error;
		}
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

const getUserPreferences = async (req: Request, res: Response) => {
	if (!req.user?.id) {
		throw unauthorized("Authentication required.");
	}

	const preferences = await preferencesService.getUserPreferences(req.user.id);

	return ok(res, "User preferences fetched successfully", preferences);
};

const updateUserPreferences = async (req: Request, res: Response) => {
	if (!req.user?.id) {
		throw unauthorized("Authentication required.");
	}

	const input = parseSchema(updateUserPreferencesSchema, req.body);
	const preferences = await preferencesService.upsertUserPreferences(req.user.id, input);

	return ok(res, "User preferences updated successfully", preferences);
};

export {
	loginUser,
	registerUser,
	handleCallback,
	logoutUser,
	getCurrentUser,
	getOptionalCurrentUser,
	getUserPreferences,
	updateUserPreferences,
};
