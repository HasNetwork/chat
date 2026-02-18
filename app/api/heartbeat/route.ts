import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Users are considered offline if they haven't pinged in 60 seconds
const OFFLINE_THRESHOLD_MS = 60_000;

export async function POST() {
	const session = await getSession();
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const userId = parseInt(session.user.id);
	if (isNaN(userId)) {
		return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
	}

	const now = new Date();

	// Mark this user as online + update lastSeen
	// Also mark stale users as offline in the same request
	const cutoff = new Date(now.getTime() - OFFLINE_THRESHOLD_MS);

	await Promise.all([
		db.user.update({
			where: { id: userId },
			data: { online: true, lastSeen: now },
		}),
		db.user.updateMany({
			where: {
				online: true,
				lastSeen: { lt: cutoff },
				id: { not: userId },
			},
			data: { online: false },
		}),
	]);

	return NextResponse.json({ ok: true });
}
