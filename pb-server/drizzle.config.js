import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./drizzle",
	schema: [
		"./src/common/dto/base.dto.ts",
		"./src/modules/auth/model/user.model.ts",
		"./src/modules/poll/model/polls.model.ts",
		"./src/modules/poll/model/questions.model.ts",
		"./src/modules/poll/model/options.model.ts",
		"./src/modules/poll/model/responses.model.ts",
		"./src/modules/poll/model/responseSessions.model.ts",
		"./src/modules/poll/model/answers.model.ts",
	],
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL,
	},
});
