import { createHash } from "node:crypto";
import { redis } from "../../../common/config/redis";
import { env } from "../../../config/env";

function hash(value: string) {
	return createHash("sha256").update(value).digest("hex");
}

export function createDeviceFingerprint(input: {
	userId?: string | null;
	anonymousIdentifier?: string | null;
	ipAddress?: string | null;
	userAgent?: string | null;
	deviceFingerprint?: string | null;
}) {
	if (input.userId) {
		return `user:${input.userId}`;
	}

	if (input.anonymousIdentifier) {
		return `anonymous:${hash(input.anonymousIdentifier)}`;
	}

	return `device:${hash(
		[input.deviceFingerprint, input.ipAddress, input.userAgent].filter(Boolean).join(":")
	)}`;
}

export async function claimVoteOnce(pollId: string, fingerprint: string) {
	const key = `poll:${pollId}:voter:${fingerprint}`;
	const claimed = await redis.set(key, "1", "EX", env.voteDuplicateTtlSeconds, "NX");

	return claimed === "OK";
}

export async function releaseVoteClaim(pollId: string, fingerprint: string) {
	await redis.del(`poll:${pollId}:voter:${fingerprint}`);
}
