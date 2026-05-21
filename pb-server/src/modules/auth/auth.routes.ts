import express from "express";
import type { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler";
import * as controller from "./auth.controller";
import { requireAuth } from "./auth.middleware";

export const authRouter: Router = express.Router();

// Public Routes
authRouter.get("/login", asyncHandler(controller.loginUser));
authRouter.get("/register", asyncHandler(controller.registerUser));
authRouter.get("/callback", asyncHandler(controller.handleCallback));
authRouter.get("/optional-current-user", asyncHandler(controller.getOptionalCurrentUser));

// Protected Route
authRouter.get("/logout", requireAuth, asyncHandler(controller.logoutUser));
authRouter.get("/current-user", requireAuth, asyncHandler(controller.getCurrentUser));
