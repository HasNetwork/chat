import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
	try {
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const userId = parseInt(session.user.id);
		const userRooms = await db.userRoom.findMany({
			where: { userId },
			include: { room: true },
		});

		const rooms = userRooms.map((ur) => ur.room.name);
		return NextResponse.json({ rooms });
	} catch (error) {
		console.error("Rooms GET error:", error);
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

		const { name } = await req.json();
		if (!name || typeof name !== "string" || name.trim().length === 0) {
			return NextResponse.json(
				{ error: "Room name is required" },
				{ status: 400 },
			);
		}

		const roomName = name.trim();
		const userId = parseInt(session.user.id);

		// Create room and add user in a transaction
		await db.$transaction([
			db.room.upsert({
				where: { name: roomName },
				update: {},
				create: { name: roomName },
			}),
			db.userRoom.upsert({
				where: {
					userId_roomName: { userId, roomName },
				},
				update: {},
				create: { userId, roomName },
			}),
		]);

		return NextResponse.json({ room: roomName }, { status: 200 });
	} catch (error) {
		console.error("Rooms POST error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
