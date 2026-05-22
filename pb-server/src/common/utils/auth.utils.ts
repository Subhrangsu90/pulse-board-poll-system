import { Request, Response } from "express";
import { env } from "../../config/env";

const COOKIE_MAX_AGE_SECONDS = 60 * 60;
type CookieMap = Record<string, string>;

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

	return `${getBaseUrl(req)}/api/v1/auth/callback`;
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
		sameSite: "none",
		maxAge: maxAge * 1000,
		path: "/",
	});
};
const parseCookies = (req: Request): CookieMap => {
	const header = req.headers.cookie;

	if (!header) return {};

	return header.split(";").reduce<CookieMap>((cookies, pair) => {
		const [rawName, ...rawValue] = pair.trim().split("=");

		if (!rawName) return cookies;

		cookies[rawName] = decodeURIComponent(rawValue.join("="));

		return cookies;
	}, {});
};

const clearCookie = (res: Response, req: Request, name: string) => {
	res.clearCookie(name, {
		httpOnly: true,
		secure: shouldUseSecureCookies(req),
		sameSite: "none",
		path: "/",
	});
};

export { getIssuer, getBaseUrl, getRedirectUri, setCookie, parseCookies, clearCookie };
