import express from "express";
import type { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler";
import * as controller from "./auth.controller";

export const authRouter: Router = express.Router();

authRouter.get("/login", asyncHandler(controller.loginUser));
