import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import type { Request } from "express";
import { db } from "../../common/config/db";
import { getIssuer, getRedirectUri, parseCookies } from "../../common/utils/auth.utils";
import { env } from "../../config/env";
import type { TokenResponse } from "./model/auth.types";
import { users } from "./dto/user.dto";
import type { CurrentUser, NewUser, OidcUserInfo, User } from "./model/user.types";
export const STATE_COOKIE_NAME = "pb_auth_state";
export const AUTH_COOKIE_NAME = "pb_auth_token";

const createLoginUrl = (req: Request) => {
	const state = crypto.randomBytes(24).toString("base64url");
	const loginUrl = new URL("/auth/authenticate", getIssuer());

	loginUrl.searchParams.set("response_type", "code");
	loginUrl.searchParams.set("client_id", env.oidcClientId ?? "");
	loginUrl.searchParams.set("redirect_uri", getRedirectUri(req));
	loginUrl.searchParams.set("scope", "openid profile email");
	loginUrl.searchParams.set("state", state);

	return {
		loginUrl,
		state,
	};
};

const createRegisterUrl = (req: Request) => {
	const state = crypto.randomBytes(24).toString("base64url");
	const registerUrl = new URL("/sign-up", getIssuer());

	registerUrl.searchParams.set("response_type", "code");
	registerUrl.searchParams.set("client_id", env.oidcClientId ?? "");
	registerUrl.searchParams.set("redirect_uri", getRedirectUri(req));
	registerUrl.searchParams.set("scope", "openid profile email");
	registerUrl.searchParams.set("state", state);

	return {
		registerUrl,
		state,
	};
};

const getStateToken = (req: Request) => {
	const cookies = parseCookies(req);

	return cookies[STATE_COOKIE_NAME];
};

const exchangeCodeForToken = async (req: Request, code: string): Promise<TokenResponse> => {
	const tokenUrl = new URL("/auth/token", getIssuer());

	const tokenResponse = await fetch(tokenUrl.toString(), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			grant_type: "authorization_code",
			code,
			redirect_uri: getRedirectUri(req),
			client_id: env.oidcClientId,
			client_secret: env.oidcClientSecret,
		}),
	});

	const tokenData = (await tokenResponse.json().catch(() => ({}))) as Partial<TokenResponse> & {
		message?: string;
		error?: string;
	};

	if (!tokenResponse.ok) {
		throw new Error(tokenData.message || tokenData.error || "Token exchange failed.");
	}

	return tokenData as TokenResponse;
};

async function revokeToken(req: Request) {
	const token = parseCookies(req)[AUTH_COOKIE_NAME];
	if (!token) return;

	await fetch(`${getIssuer()}/oauth/revoke`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			token,
			token_type_hint: "refresh_token",
			client_id: process.env.OIDC_CLIENT_ID,
			client_secret: process.env.OIDC_CLIENT_SECRET,
		}),
	}).catch(() => {});
}

const fetchUserInfo = async (token: string): Promise<OidcUserInfo | null> => {
	const userinfoEndpoint = `${getIssuer()}/user/userinfo`;

	const response = await fetch(userinfoEndpoint, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (response.status === 401) return null;

	const data = (await response.json().catch(() => ({}))) as Partial<{
		message: string;
	}>;

	if (!response.ok) {
		throw new Error(data.message || "Unable to load current user.");
	}

	return data as OidcUserInfo;
};

const normalizeOidcUser = (userInfo: OidcUserInfo): NewUser => {
	if (!userInfo.sub) {
		throw new Error("OIDC user is missing sub.");
	}

	if (!userInfo.email) {
		throw new Error("OIDC user is missing email.");
	}

	return {
		oidcSub: userInfo.sub,
		email: userInfo.email,
		name: (userInfo.name || userInfo.email).slice(0, 100),
		picture: userInfo.picture ?? null,
	};
};

const upsertUserFromOidc = async (userInfo: OidcUserInfo): Promise<User> => {
	const user = normalizeOidcUser(userInfo);
	const [savedUser] = await db
		.insert(users)
		.values(user)
		.onConflictDoUpdate({
			target: users.oidcSub,
			set: {
				email: user.email,
				name: user.name,
				picture: user.picture,
				updatedAt: sql`now()`,
			},
		})
		.returning();

	if (!savedUser) {
		throw new Error("Unable to save OIDC user.");
	}

	return savedUser;
};

const persistUserFromToken = async (token: string) => {
	const userInfo = await fetchUserInfo(token);

	if (!userInfo) {
		throw new Error("Unable to load OIDC user.");
	}

	return upsertUserFromOidc(userInfo);
};

const fetchCurrentUser = async (req: Request): Promise<CurrentUser | null> => {
	const token = parseCookies(req)[AUTH_COOKIE_NAME];
	if (!token) return null;

	const userInfo = await fetchUserInfo(token);
	if (!userInfo) return null;

	const savedUser = await upsertUserFromOidc(userInfo);

	return {
		id: savedUser.id,
		email: savedUser.email,
		name: savedUser.name,
		picture: savedUser.picture,
	};
};

export {
	createLoginUrl,
	createRegisterUrl,
	getStateToken,
	exchangeCodeForToken,
	persistUserFromToken,
	revokeToken,
	fetchCurrentUser,
};
