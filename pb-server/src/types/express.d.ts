import type { CurrentUser } from "../modules/auth/model/user.types";

declare global {
	namespace Express {
		interface Request {
			user?: CurrentUser;
		}
	}
}

export {};
