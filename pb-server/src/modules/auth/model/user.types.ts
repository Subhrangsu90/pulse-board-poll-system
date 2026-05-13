import type { users } from "../dto/user.dto";

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type OidcUserInfo = {
	sub?: string;
	email?: string;
	name?: string;
	picture?: string | null;
};

export type CurrentUser = OidcUserInfo & {
	id?: number;
	oidcSub?: string;
};
