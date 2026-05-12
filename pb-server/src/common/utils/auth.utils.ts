import { Request, Response } from "express";
import { env } from "../../config/env";

const COOKIE_MAX_AGE_SECONDS = 60 * 60;

const getIssuer = () => {
	return env.oidcIssuer;
};

const getBaseUrl = (req: Request) => {
	if (env.baseUrl) {
		return env.baseUrl;
	}

	return `${req.protocol}://${req.get("host")}`;
};

const getRedirectUri = (req: Request) => {
	if (env.redirectUri) {
		return env.redirectUri;
	}

	return `${getBaseUrl(req)}/auth/callback`;
};

const shouldUseSecureCookies = (req: Request) => {
	if (typeof env.cookieSecure === "string") {
		return env.cookieSecure === "true";
	}

	const forwardedProto = req.get("x-forwarded-proto");
	return req.secure || forwardedProto === "https";
};

const setCookie = (
	res: Response,
	req: Request,
	name: string,
	value: string,
	maxAge = COOKIE_MAX_AGE_SECONDS
) => {
	res.cookie(name, value, {
		httpOnly: true,
		secure: shouldUseSecureCookies(req),
		sameSite: "lax",
		maxAge: maxAge * 1000,
		path: "/",
	});
};

export { getIssuer, getBaseUrl, getRedirectUri, setCookie };
