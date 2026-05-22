import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import { ok } from "./common/utils/api.response";
import { errorMiddleware } from "./common/middleware/error.middleware";
import { notFound } from "./common/utils/api.error";
import { v1Router } from "./routes/v1.routes";

export function createApp() {
	const app = express();
    app.set("trust proxy",1);
	app.usr(
		cors({
			origin: "https://pulse-board-poll-system.vercel.app",
			credentials: true,
		})
	);
	app.use(express.json());
	app.use(express.urlencoded({ extended: false }));
	app.use(cookieParser());

	app.get("/", (_req: Request, res: Response) => {
		return ok(res, "PulseBoard API running...");
	});

	app.get("/health", (_req: Request, res: Response) => {
		const healthData = {
			healthy: true,
			version: "1.0.0",
			date: new Date().toISOString(),
			uptime: process.uptime(),
		};

		return ok(res, "PulseBoard server is healthy", healthData);
	});

	app.use("/api/v1", v1Router);

	app.use((_req, _res, next) => {
		next(notFound("Route not found"));
	});

	app.use(errorMiddleware);

	return app;
}
