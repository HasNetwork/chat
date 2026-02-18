import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const room = req.nextUrl.searchParams.get("room");
	if (!room) {
		return NextResponse.json({ error: "Missing room" }, { status: 400 });
	}

	const members = await db.userRoom.findMany({
		where: { roomName: room },
		select: {
			user: {
				select: {
					id: true,
					username: true,
					online: true,
				},
			},
		},
	});

	return NextResponse.json({
		members: members.map((m) => ({
			id: m.user.id,
			username: m.user.username,
			online: m.user.online,
		})),
	});
}
