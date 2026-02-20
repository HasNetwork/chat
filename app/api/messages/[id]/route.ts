import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { triggerPusher, roomChannel, PUSHER_EVENTS } from "@/lib/pusher";

export async function PATCH(
	req: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const messageId = parseInt(params.id);
		const { content } = await req.json();

		if (!content) {
			return NextResponse.json(
				{ error: "Content is required" },
				{ status: 400 },
			);
		}

		const message = await db.message.findUnique({ where: { id: messageId } });
		if (!message) {
			return NextResponse.json({ error: "Message not found" }, { status: 404 });
		}

		if (message.userId !== parseInt(session.user.id)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const updated = await db.message.update({
			where: { id: messageId },
			data: { content, editedAt: new Date() },
		});

		const eventData = {
			message_id: messageId,
			new_content: content,
			edited_at: updated.editedAt!.toISOString(),
		};

		triggerPusher(
			roomChannel(message.roomName),
			PUSHER_EVENTS.MESSAGE_EDITED,
			eventData,
		);

		return NextResponse.json(eventData);
	} catch (error) {
		console.error("Message PATCH error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	req: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const messageId = parseInt(params.id);

		const message = await db.message.findUnique({ where: { id: messageId } });
		if (!message) {
			return NextResponse.json({ error: "Message not found" }, { status: 404 });
		}

		if (message.userId !== parseInt(session.user.id)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		await db.message.update({
			where: { id: messageId },
			data: { isDeleted: true },
		});

		const eventData = { message_id: messageId };

		triggerPusher(
			roomChannel(message.roomName),
			PUSHER_EVENTS.MESSAGE_DELETED,
			eventData,
		);

		return NextResponse.json(eventData);
	} catch (error) {
		console.error("Message DELETE error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
