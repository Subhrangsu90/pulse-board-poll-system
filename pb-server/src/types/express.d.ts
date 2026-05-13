import type { CurrentUser } from "../modules/auth/auth.service";

declare global {
	namespace Express {
		interface Request {
			user?: CurrentUser;
		}
	}
}

export {};
