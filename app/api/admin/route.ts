import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { createImpersonationToken } from "@/lib/impersonate";

async function checkAdmin() {
	const session = await getSession();
	if (!session?.user?.isAdmin) {
		return null;
	}
	return session.user;
}

export async function GET(req: NextRequest) {
	try {
		const admin = await checkAdmin();
		if (!admin) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const { searchParams } = new URL(req.url);
		const resource = searchParams.get("resource");

		if (resource === "users") {
			const users = await db.user.findMany({
				include: {
					rooms: { include: { room: true } },
				},
				orderBy: { id: "asc" },
			});

			return NextResponse.json({
				users: users.map((u) => ({
					id: u.id,
					username: u.username,
					isAdmin: u.isAdmin,
					online: u.online,
					rooms: u.rooms.map((r) => r.roomName),
				})),
			});
		}

		if (resource === "rooms") {
			const rooms = await db.room.findMany({
				include: {
					users: {
						include: { user: { select: { id: true, username: true } } },
					},
					_count: { select: { messages: true } },
				},
			});

			return NextResponse.json({
				rooms: rooms.map((r) => ({
					name: r.name,
					users: r.users.map((ur) => ({
						id: ur.user.id,
						username: ur.user.username,
					})),
					messageCount: r._count.messages,
				})),
			});
		}

		if (resource === "files") {
			const files = await db.message.findMany({
				where: { isFile: true, isDeleted: false },
				orderBy: { timestamp: "desc" },
				select: {
					id: true,
					content: true,
					filename: true,
					timestamp: true,
					roomName: true,
					username: true,
				},
			});

			return NextResponse.json({
				files: files.map((f) => ({
					id: f.id,
					url: f.content,
					filename: f.filename,
					room: f.roomName,
					uploadedBy: f.username,
					uploadedAt: f.timestamp.toISOString(),
				})),
			});
		}

		return NextResponse.json({ error: "Invalid resource" }, { status: 400 });
	} catch (error) {
		console.error("Admin GET error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest) {
	try {
		const admin = await checkAdmin();
		if (!admin) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const { action, roomName, userId, fileId } = await req.json();

		switch (action) {
			case "clearRoom": {
				await db.message.deleteMany({ where: { roomName } });
				return NextResponse.json({ message: `Room "${roomName}" cleared.` });
			}

			case "deleteRoom": {
				// Delete all related data and the room
				await db.message.deleteMany({ where: { roomName } });
				await db.userRoom.deleteMany({ where: { roomName } });
				await db.room.delete({ where: { name: roomName } });
				return NextResponse.json({ message: `Room "${roomName}" deleted.` });
			}

			case "removeUserFromRoom": {
				await db.userRoom.delete({
					where: { userId_roomName: { userId, roomName } },
				});
				return NextResponse.json({
					message: `User removed from room "${roomName}".`,
				});
			}

			case "deleteUser": {
				// Cascade: reactions, seen, messages, room memberships, then user
				await db.reaction.deleteMany({ where: { userId } });
				await db.messageSeen.deleteMany({ where: { userId } });
				await db.message.deleteMany({ where: { userId } });
				await db.userRoom.deleteMany({ where: { userId } });
				await db.user.delete({ where: { id: userId } });
				return NextResponse.json({ message: "User deleted." });
			}

			case "loginAs": {
				const user = await db.user.findUnique({ where: { id: userId } });
				if (!user) {
					return NextResponse.json(
						{ error: "User not found" },
						{ status: 404 },
					);
				}
				const token = createImpersonationToken(user.id);
				return NextResponse.json({
					username: user.username,
					impersonationToken: token,
				});
			}

			case "deleteFile": {
				await db.message.update({
					where: { id: fileId },
					data: { isDeleted: true },
				});
				return NextResponse.json({ message: "File deleted." });
			}

			default:
				return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}
	} catch (error) {
		console.error("Admin POST error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
