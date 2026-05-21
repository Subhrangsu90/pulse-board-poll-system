import type { NextFunction, Request, Response } from "express";
import { redis } from "../config/redis";
import { apiError } from "../utils/api.error";

function clientKey(req: Request) {
	const forwardedFor = req.get("x-forwarded-for");
	const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? req.ip ?? "unknown";

	return ipAddress.replace(/[^a-zA-Z0-9:._-]/g, "_");
}

export function redisRateLimit(options: {
	prefix: string;
	windowSeconds: number;
	max: number;
	key?: (req: Request) => string;
}) {
	return async (req: Request, _res: Response, next: NextFunction) => {
		const key = `rate:${options.prefix}:${options.key?.(req) ?? clientKey(req)}`;
		const count = await redis.incr(key);

		if (count === 1) {
			await redis.expire(key, options.windowSeconds);
		}

		if (count > options.max) {
			next(
				apiError({
					statusCode: 429,
					message: "Too many requests. Please slow down.",
				})
			);
			return;
		}

		next();
	};
}
