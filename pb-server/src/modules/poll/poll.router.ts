import express from "express";
import type { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler";
import { requireAuth } from "../auth/auth.middleware";
import * as controller from "./poll.controller";

export const pollRouter: Router = express.Router();

pollRouter.get("/public/poll/:slug", asyncHandler(controller.getPublicPollBySlug));
pollRouter.post("/public/poll/:slug/responses", asyncHandler(controller.submitPublicPollResponse));
pollRouter.post("/polls", requireAuth, asyncHandler(controller.createPolls));
pollRouter.post("/polls/:pollId/questions", requireAuth, asyncHandler(controller.addQuestionToPoll));
pollRouter.post("/polls/:pollId/publish", requireAuth, asyncHandler(controller.publishPoll));
pollRouter.patch("/polls/:pollId", requireAuth, asyncHandler(controller.updatePoll));
pollRouter.patch("/polls/:pollId/complete", requireAuth, asyncHandler(controller.completePoll));
pollRouter.delete("/polls/:pollId", requireAuth, asyncHandler(controller.deletePoll));
pollRouter.put("/questions/:questionId", requireAuth, asyncHandler(controller.updateQuestion));
pollRouter.delete("/questions/:questionId", requireAuth, asyncHandler(controller.deleteQuestion));
pollRouter.get("/polls/:pollId", requireAuth, asyncHandler(controller.getPollById));
pollRouter.get("/polls", requireAuth, asyncHandler(controller.getAllPolls));
