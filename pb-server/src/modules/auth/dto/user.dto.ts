import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: serial("id").primaryKey(),
	oidcSub: varchar("oidc_sub", { length: 255 }).notNull().unique(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	name: varchar("name", { length: 100 }).notNull(),
	picture: text("picture"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
