import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer, roomChannel, PUSHER_EVENTS } from "@/lib/pusher";

export async function POST(
	req: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const messageId = parseInt(params.id);
		const userId = parseInt(session.user.id);

		// Check if already seen
		const existing = await db.messageSeen.findFirst({
			where: { messageId, userId },
		});

		if (!existing) {
			await db.messageSeen.create({
				data: { messageId, userId },
			});
		}

		// Get all seen usernames + message room in parallel
		const [seenRecords, message] = await Promise.all([
			db.messageSeen.findMany({
				where: { messageId },
				include: { user: { select: { username: true } } },
			}),
			db.message.findUnique({
				where: { id: messageId },
				select: { roomName: true },
			}),
		]);

		const eventData = {
			message_id: messageId,
			seen_by: seenRecords.map((s) => s.user.username),
		};

		if (message) {
			pusherServer
				.trigger(
					roomChannel(message.roomName),
					PUSHER_EVENTS.MESSAGE_SEEN,
					eventData,
				)
				.catch((err) => console.error("Pusher trigger error:", err));
		}

		return NextResponse.json(eventData);
	} catch (error) {
		console.error("Seen error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
