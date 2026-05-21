import { eq } from "drizzle-orm";
import { db } from "../../common/config/db";
import type { UpdateUserPreferencesInput } from "./dto/preferences.dto";
import { userPreferences } from "./model/user-preferences.model";

const defaultPreferences = {
	defaultResponseMode: "anonymous" as const,
	themeMode: "system" as const,
	textScale: "comfortable" as const,
};

function normalizeThemeMode(value?: string | null) {
	if (value === "light" || value === "dark" || value === "system") return value;
	return defaultPreferences.themeMode;
}

function normalizeTextScale(value?: string | null) {
	if (value === "compact" || value === "comfortable" || value === "large") return value;
	return defaultPreferences.textScale;
}

function toPreferenceResponse(row?: {
	defaultResponseMode: "anonymous" | "authenticated";
	themeMode: string | null;
	textScale: string | null;
}) {
	if (!row) return defaultPreferences;

	return {
		defaultResponseMode: row.defaultResponseMode,
		themeMode: normalizeThemeMode(row.themeMode),
		textScale: normalizeTextScale(row.textScale),
	};
}

async function getUserPreferences(userId: string) {
	const [stored] = await db
		.select()
		.from(userPreferences)
		.where(eq(userPreferences.userId, userId))
		.limit(1);

	return toPreferenceResponse(stored);
}

async function upsertUserPreferences(userId: string, input: UpdateUserPreferencesInput) {
	const current = await getUserPreferences(userId);
	const next = {
		defaultResponseMode: input.defaultResponseMode ?? current.defaultResponseMode,
		themeMode: input.themeMode ?? current.themeMode,
		textScale: input.textScale ?? current.textScale,
	};

	const [stored] = await db
		.insert(userPreferences)
		.values({
			userId,
			defaultResponseMode: next.defaultResponseMode,
			themeMode: next.themeMode,
			textScale: next.textScale,
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: userPreferences.userId,
			set: {
				defaultResponseMode: next.defaultResponseMode,
				themeMode: next.themeMode,
				textScale: next.textScale,
				updatedAt: new Date(),
			},
		})
		.returning();

	return toPreferenceResponse(stored);
}

export { getUserPreferences, upsertUserPreferences };
