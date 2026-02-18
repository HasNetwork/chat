import { randomBytes } from "crypto";

// In-memory store for admin impersonation tokens
// Each token maps to a userId and expires after 30 seconds
const impersonationTokens = new Map<
	string,
	{ userId: number; expiresAt: number }
>();

export function createImpersonationToken(userId: number): string {
	// Clean up expired tokens
	const now = Date.now();
	Array.from(impersonationTokens.entries()).forEach(([key, val]) => {
		if (val.expiresAt < now) impersonationTokens.delete(key);
	});

	const token = randomBytes(32).toString("hex");
	impersonationTokens.set(token, {
		userId,
		expiresAt: now + 30_000, // 30 second TTL
	});

	return token;
}

export function consumeImpersonationToken(token: string): number | null {
	const entry = impersonationTokens.get(token);
	if (!entry) return null;

	// Always delete after use (one-time token)
	impersonationTokens.delete(token);

	if (entry.expiresAt < Date.now()) return null;

	return entry.userId;
}
