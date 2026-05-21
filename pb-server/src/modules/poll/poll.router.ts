import express from "express";
import type { Router } from "express";
import { redisRateLimit } from "../../common/middleware/rate-limit.middleware";
import { asyncHandler } from "../../common/utils/async-handler";
import { env } from "../../config/env";
import { requireAuth } from "../auth/auth.middleware";
import * as controller from "./poll.controller";

export const pollRouter: Router = express.Router();

pollRouter.get("/public/poll/:slug", asyncHandler(controller.getPublicPollBySlug));
pollRouter.get("/public/poll/:slug/metrics", asyncHandler(controller.getPublicPollLiveMetrics));
pollRouter.get("/public/poll/:slug/results", asyncHandler(controller.getPublicPollResults));
pollRouter.post(
	"/public/poll/:slug/responses",
	redisRateLimit({
		prefix: "public-poll-response",
		windowSeconds: env.voteRateLimitWindowSeconds,
		max: env.voteRateLimitMax,
		key: (req) => {
			const forwardedFor = req.get("x-forwarded-for");
			const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
			return `${req.params.slug ?? "unknown"}:${ipAddress}`;
		},
	}),
	asyncHandler(controller.submitPublicPollResponse)
);
pollRouter.get("/polls/realtime/queue-health", requireAuth, asyncHandler(controller.getVoteQueueHealth));
pollRouter.post("/polls", requireAuth, asyncHandler(controller.createPolls));
pollRouter.post("/polls/:pollId/questions", requireAuth, asyncHandler(controller.addQuestionToPoll));
pollRouter.post("/polls/:pollId/publish", requireAuth, asyncHandler(controller.publishPoll));
pollRouter.get("/polls/:pollId/results", requireAuth, asyncHandler(controller.getPollResults));
pollRouter.patch("/polls/:pollId", requireAuth, asyncHandler(controller.updatePoll));
pollRouter.patch("/polls/:pollId/complete", requireAuth, asyncHandler(controller.completePoll));
pollRouter.delete("/polls/:pollId", requireAuth, asyncHandler(controller.deletePoll));
pollRouter.put("/questions/:questionId", requireAuth, asyncHandler(controller.updateQuestion));
pollRouter.delete("/questions/:questionId", requireAuth, asyncHandler(controller.deleteQuestion));
pollRouter.get("/polls/:pollId", requireAuth, asyncHandler(controller.getPollById));
pollRouter.get("/polls", requireAuth, asyncHandler(controller.getAllPolls));
