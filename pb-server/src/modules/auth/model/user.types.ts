import type { users } from "./user.model";

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type OidcUserInfo = {
	sub?: string;
	email?: string;
	name?: string;
	picture?: string | null;
};

export type CurrentUser = {
	id: string;
	email: string;
	name: string;
	picture: string | null;
};
