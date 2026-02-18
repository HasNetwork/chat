import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer, roomChannel, PUSHER_EVENTS } from "@/lib/pusher";

export async function GET(req: NextRequest) {
	try {
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const room = searchParams.get("room");

		if (!room) {
			return NextResponse.json(
				{ error: "Room parameter is required" },
				{ status: 400 },
			);
		}

		const messages = await db.message.findMany({
			where: { roomName: room },
			orderBy: { timestamp: "desc" },
			take: 50,
			include: {
				reactions: {
					include: { user: { select: { username: true } } },
				},
				seenBy: {
					include: { user: { select: { username: true } } },
				},
			},
		});

		// Reverse to show oldest first
		const history = messages.reverse().map((msg) => ({
			id: msg.id,
			user: msg.username,
			message: msg.content,
			is_file: msg.isFile,
			filename: msg.filename,
			url: msg.isFile ? msg.content : null,
			timestamp: msg.timestamp.toISOString(),
			parent_id: msg.parentId,
			is_deleted: msg.isDeleted,
			edited_at: msg.editedAt?.toISOString() ?? null,
			reactions: msg.reactions.map((r) => ({
				emoji: r.emoji,
				user: r.user.username,
			})),
			seen_by: msg.seenBy.map((s) => s.user.username),
		}));

		return NextResponse.json({ messages: history });
	} catch (error) {
		console.error("Messages GET error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest) {
	try {
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { room, message, parent_id } = await req.json();

		if (!room || !message) {
			return NextResponse.json(
				{ error: "Room and message are required" },
				{ status: 400 },
			);
		}

		const userId = parseInt(session.user.id);

		const newMessage = await db.message.create({
			data: {
				roomName: room,
				userId,
				username: session.user.username,
				content: message,
				parentId: parent_id ?? null,
			},
		});

		const messageData = {
			id: newMessage.id,
			user: session.user.username,
			message: newMessage.content,
			is_file: false,
			filename: null,
			url: null,
			timestamp: newMessage.timestamp.toISOString(),
			parent_id: newMessage.parentId,
			is_deleted: false,
			edited_at: null,
			reactions: [],
			seen_by: [],
		};

		// Broadcast via Pusher
		await pusherServer.trigger(
			roomChannel(room),
			PUSHER_EVENTS.NEW_MESSAGE,
			messageData,
		);

		return NextResponse.json(messageData, { status: 201 });
	} catch (error) {
		console.error("Messages POST error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
