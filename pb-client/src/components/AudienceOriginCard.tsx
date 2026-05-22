import { useMemo } from "react";
import { aggregateAudienceRegions } from "../utils/audienceRegion";

type AudienceOriginCardProps = {
	regions?: Record<string, number>;
	activeViewers?: number;
};

export function AudienceOriginCard({
	regions,
	activeViewers = 0,
}: AudienceOriginCardProps) {
	const audienceRegions = useMemo(
		() => aggregateAudienceRegions(regions, 6),
		[regions],
	);
	const totalViewers = Math.max(
		activeViewers,
		audienceRegions.reduce((total, region) => total + region.count, 0),
	);

	return (
		<section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
			<h2 className="mb-md font-serif text-title-lg text-primary">
				Live Audience Origin
			</h2>
			{audienceRegions.length === 0 ? (
				<p className="font-sans text-on-surface-variant">
					No live viewers right now.
				</p>
			) : (
				<div className="space-y-sm">
					{audienceRegions.map((region) => {
						const share =
							totalViewers === 0
								? 0
								: Math.round(
										(region.count / totalViewers) * 100,
									);

						return (
							<div key={region.region}>
								<div className="mb-xs flex justify-between font-sans text-label-lg">
									<span>{region.region}</span>
									<span className="text-primary">
										{region.count} ({share}%)
									</span>
								</div>
								<div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
									<div
										className="h-full rounded-full bg-primary-container"
										style={{
											width: `${Math.max(share, 8)}%`,
										}}
									/>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
}
