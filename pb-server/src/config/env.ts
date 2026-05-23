import { z } from "zod";

function trimTrailingSlash(value: string) {
	return value.replace(/\/$/, "");
}

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

	PORT: z.coerce.number().int().positive().default(8000),

	DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

	REDIS_URL: z.string().default("redis://localhost:6379"),

	VOTE_QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(50),
	VOTE_BATCH_SIZE: z.coerce.number().int().positive().default(250),
	VOTE_BATCH_FLUSH_MS: z.coerce.number().int().positive().default(1000),
	VOTE_DUPLICATE_TTL_SECONDS: z.coerce
		.number()
		.int()
		.positive()
		.default(60 * 60 * 24 * 365),
	VOTE_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(10),
	VOTE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

	OIDC_CLIENT_ID: z.string().min(1, "OIDC_CLIENT_ID is required"),
	OIDC_CLIENT_SECRET: z.string().min(1, "OIDC_CLIENT_SECRET is required"),
	OIDC_ISSUER: z
		.string()
		.default("http://localhost:3000")
		.transform(trimTrailingSlash),

	BASE_URL: z
		.string()
		.optional()
		.transform((v) => (v ? trimTrailingSlash(v) : undefined)),

	CLIENT_URL: z
		.string()
		.default("http://localhost:5173")
		.transform(trimTrailingSlash),

	REDIRECT_URI: z
		.string()
		.optional()
		.transform((v) => (v ? trimTrailingSlash(v) : undefined)),

	COOKIE_SECURE: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("❌ Invalid environment variables:");
	for (const issue of parsed.error.issues) {
		console.error(`   ${issue.path.join(".")}: ${issue.message}`);
	}
	process.exit(1);
}

const data = parsed.data;

export const env = {
	nodeEnv: data.NODE_ENV,
	port: data.PORT,
	databaseUrl: data.DATABASE_URL,
	redisUrl: data.REDIS_URL,
	voteQueueConcurrency: data.VOTE_QUEUE_CONCURRENCY,
	voteBatchSize: data.VOTE_BATCH_SIZE,
	voteBatchFlushMs: data.VOTE_BATCH_FLUSH_MS,
	voteDuplicateTtlSeconds: data.VOTE_DUPLICATE_TTL_SECONDS,
	voteRateLimitWindowSeconds: data.VOTE_RATE_LIMIT_WINDOW_SECONDS,
	voteRateLimitMax: data.VOTE_RATE_LIMIT_MAX,
	oidcClientId: data.OIDC_CLIENT_ID,
	oidcClientSecret: data.OIDC_CLIENT_SECRET,
	oidcIssuer: data.OIDC_ISSUER,
	baseUrl: data.BASE_URL,
	clientUrl: data.CLIENT_URL,
	redirectUri: data.REDIRECT_URI,
	cookieSecure: data.COOKIE_SECURE,
};
