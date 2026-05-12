import crypto from "node:crypto";
import type { Request } from "express";
import { getIssuer, getRedirectUri } from "../../common/utils/auth.utils";
import { env } from "../../config/env";

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

export { createLoginUrl };
