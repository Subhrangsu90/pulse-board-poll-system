import type { z } from "zod";
import { badRequest } from "./api.error";

export function parseSchema<T>(schema: z.ZodType<T>, data: unknown): T {
	const result = schema.safeParse(data);

	if (!result.success) {
		throw badRequest(
			"Validation failed.",
			result.error.issues.map((issue) => ({
				path: issue.path.join("."),
				message: issue.message,
			}))
		);
	}

	return result.data;
}
