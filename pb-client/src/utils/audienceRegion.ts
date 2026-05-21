const INDIAN_TIMEZONE_MARKERS = ["Asia/Kolkata", "Asia/Calcutta", "AsiaKolkata", "AsiaCalcutta"];

const REGION_OVERRIDES: Record<string, string> = {
	IN: "India",
	IND: "India",
	India: "India",
};

let regionDisplayNames: Intl.DisplayNames | undefined;

function getRegionDisplayNames() {
	if (!regionDisplayNames) {
		try {
			regionDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });
		} catch {
			regionDisplayNames = undefined;
		}
	}

	return regionDisplayNames;
}

export function formatAudienceRegion(region: string) {
	const trimmed = region.trim();
	if (!trimmed || trimmed === "Unknown") return "Unknown";

	const override = REGION_OVERRIDES[trimmed] ?? REGION_OVERRIDES[trimmed.toUpperCase()];
	if (override) return override;

	if (INDIAN_TIMEZONE_MARKERS.some((marker) => trimmed.includes(marker.replace("/", "")) || trimmed === marker)) {
		return "India";
	}

	if (/^[A-Za-z]{2}$/.test(trimmed)) {
		const displayName = getRegionDisplayNames()?.of(trimmed.toUpperCase());
		if (displayName) return displayName;
	}

	if (trimmed.includes("/")) {
		return formatAudienceRegion(trimmed.split("/").pop()?.replace(/_/g, " ") ?? trimmed);
	}

	return trimmed;
}

export function getViewerRegion() {
	const locale = navigator.language || Intl.DateTimeFormat().resolvedOptions().locale || "";
	const localeRegion = locale.split("-")[1];
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	if (localeRegion) return formatAudienceRegion(localeRegion);
	if (timezone) return formatAudienceRegion(timezone);
	return "Unknown";
}

export function aggregateAudienceRegions(regions: Record<string, number> | undefined, limit = 8) {
	const aggregated = new Map<string, number>();

	for (const [key, count] of Object.entries(regions ?? {})) {
		if (count <= 0) continue;

		const label = formatAudienceRegion(key);
		aggregated.set(label, (aggregated.get(label) ?? 0) + count);
	}

	return [...aggregated.entries()]
		.map(([region, count]) => ({ region, count }))
		.sort((left, right) => right.count - left.count)
		.slice(0, limit);
}

export function getRegionInitials(region: string) {
	if (region === "India") return "IN";
	if (region === "Unknown") return "?";

	const words = region.split(/\s+/).filter(Boolean);
	if (words.length >= 2) {
		return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
	}

	return region.slice(0, 2).toUpperCase();
}
