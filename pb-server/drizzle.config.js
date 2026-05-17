import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./drizzle",
	schema: [
		"./src/common/dto/base.dto.ts",
		"./src/modules/auth/dto/user.dto.ts",
		"./src/modules/poll/dto/polls.dto.ts",
	],
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL,
	},
});
