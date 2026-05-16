import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes";
import { pollRouter } from "../modules/poll/poll.router";

export const v1Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/poll", pollRouter);
