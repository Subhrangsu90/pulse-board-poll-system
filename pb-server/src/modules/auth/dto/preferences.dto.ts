import { z } from "zod";

const themeModeSchema = z.enum(["light", "dark", "system"]);
const textScaleSchema = z.enum(["compact", "comfortable", "large"]);

export const updateUserPreferencesSchema = z
	.object({
		defaultResponseMode: z.enum(["anonymous", "authenticated"]).optional(),
		themeMode: themeModeSchema.optional(),
		textScale: textScaleSchema.optional(),
	})
	.refine((value) => Object.keys(value).length > 0, {
		message: "At least one preference must be provided.",
	});

export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesSchema>;

export { themeModeSchema, textScaleSchema };
