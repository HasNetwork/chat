import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { put } from "@vercel/blob";
import { pusherServer, roomChannel, PUSHER_EVENTS } from "@/lib/pusher";

export async function POST(req: NextRequest) {
	try {
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const formData = await req.formData();
		const file = formData.get("file") as File | null;
		const room = formData.get("room") as string | null;

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		if (!room) {
			return NextResponse.json({ error: "Room is required" }, { status: 400 });
		}

		// Upload to Vercel Blob
		const blob = await put(`uploads/${Date.now()}-${file.name}`, file, {
			access: "public",
		});

		const userId = parseInt(session.user.id);

		// Create message record
		const newMessage = await db.message.create({
			data: {
				roomName: room,
				userId,
				username: session.user.username,
				content: blob.url,
				isFile: true,
				filename: file.name,
			},
		});

		const messageData = {
			id: newMessage.id,
			user: session.user.username,
			message: blob.url,
			is_file: true,
			filename: file.name,
			url: blob.url,
			timestamp: newMessage.timestamp.toISOString(),
			parent_id: null,
			is_deleted: false,
			edited_at: null,
			reactions: [],
			seen_by: [],
		};

		await pusherServer.trigger(
			roomChannel(room),
			PUSHER_EVENTS.NEW_MESSAGE,
			messageData,
		);

		return NextResponse.json(messageData, { status: 201 });
	} catch (error) {
		console.error("Upload error:", error);
		return NextResponse.json({ error: "Upload failed" }, { status: 500 });
	}
}
