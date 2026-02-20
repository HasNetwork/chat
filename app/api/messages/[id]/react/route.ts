import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { triggerPusher, roomChannel, PUSHER_EVENTS } from "@/lib/pusher";

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
		const { emoji } = await req.json();

		if (!emoji) {
			return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
		}

		const userId = parseInt(session.user.id);

		// Toggle: delete existing reaction from this user, then add new one
		const existing = await db.reaction.findFirst({
			where: { messageId, userId },
		});

		if (existing) {
			await db.reaction.delete({ where: { id: existing.id } });
		}

		// Only add if it's a different emoji (or no previous reaction)
		if (!existing || existing.emoji !== emoji) {
			await db.reaction.create({
				data: { messageId, userId, emoji },
			});
		}

		// Fetch updated reactions + message room in parallel
		const [reactions, message] = await Promise.all([
			db.reaction.findMany({
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
			reactions: reactions.map((r) => ({
				emoji: r.emoji,
				user: r.user.username,
			})),
		};

		if (message) {
			triggerPusher(
				roomChannel(message.roomName),
				PUSHER_EVENTS.MESSAGE_REACTED,
				eventData,
			);
		}

		return NextResponse.json(eventData);
	} catch (error) {
		console.error("React error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
