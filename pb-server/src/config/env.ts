const DEFAULT_PORT = 8000;

function parsePort(value: string | undefined) {
	if (!value) {
		return DEFAULT_PORT;
	}

	const port = Number(value);
	if (!Number.isInteger(port) || port <= 0) {
		throw new Error("PORT must be a positive integer.");
	}

	return port;
}

function trimTrailingSlash(value: string) {
	return value.replace(/\/$/, "");
}

export const env = {
	nodeEnv: process.env.NODE_ENV ?? "development",
	port: parsePort(process.env.PORT),
	oidcClientId: process.env.OIDC_CLIENT_ID,
	oidcClientSecret: process.env.OIDC_CLIENT_SECRET,
	oidcIssuer: trimTrailingSlash(process.env.OIDC_ISSUER ?? "http://localhost:3000"),
	baseUrl: process.env.BASE_URL ? trimTrailingSlash(process.env.BASE_URL) : undefined,
	redirectUri: process.env.REDIRECT_URI ? trimTrailingSlash(process.env.REDIRECT_URI) : undefined,
	cookieSecure: process.env.COOKIE_SECURE,
};
