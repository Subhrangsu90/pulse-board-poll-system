import type { RequestHandler } from "express";
import { logger } from "../utils/logger";

const SLOW_REQUEST_MS = 500;

export const requestTiming: RequestHandler = (req, res, next) => {
	const startedAt = process.hrtime.bigint();
	const originalWriteHead = res.writeHead;

	function getDurationMs() {
		return Number(process.hrtime.bigint() - startedAt) / 1_000_000;
	}

	res.writeHead = function writeHeadWithTiming(
		this: typeof res,
		...args: Parameters<typeof originalWriteHead>
	) {
		const roundedDuration = getDurationMs().toFixed(1);

		if (!res.hasHeader("X-Response-Time")) {
			res.setHeader("X-Response-Time", `${roundedDuration}ms`);
			res.setHeader("Server-Timing", `app;dur=${roundedDuration}`);
		}

		return originalWriteHead.apply(this, args);
	} as typeof res.writeHead;

	res.on("finish", () => {
		const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
		const roundedDuration = durationMs.toFixed(1);

		if (durationMs >= SLOW_REQUEST_MS) {
			logger.info(
				`slow request ${req.method} ${req.originalUrl} ${res.statusCode} ${roundedDuration}ms`
			);
		}
	});

	next();
};
