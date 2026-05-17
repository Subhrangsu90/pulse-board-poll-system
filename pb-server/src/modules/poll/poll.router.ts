import express from "express";
import type { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler";
import { requireAuth } from "../auth/auth.middleware";
import * as controller from "./poll.controller";

export const pollRouter: Router = express.Router();

pollRouter.post("/polls", requireAuth, asyncHandler(controller.createPolls));
pollRouter.patch("/polls/:pollId/complete", requireAuth, asyncHandler(controller.completePoll));
pollRouter.get("/polls", requireAuth, asyncHandler(controller.getAllPolls));
