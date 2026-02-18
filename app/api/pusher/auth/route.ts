import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
	try {
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const formData = await req.formData();
		const socketId = formData.get("socket_id") as string;
		const channel = formData.get("channel_name") as string;

		if (!socketId || !channel) {
			return NextResponse.json(
				{ error: "Missing parameters" },
				{ status: 400 },
			);
		}

		const presenceData = {
			user_id: session.user.id,
			user_info: {
				username: session.user.username,
			},
		};

		// For private channels, authorize directly
		// For presence channels, include user data
		const authResponse = channel.startsWith("presence-")
			? pusherServer.authorizeChannel(socketId, channel, presenceData)
			: pusherServer.authorizeChannel(socketId, channel);

		return NextResponse.json(authResponse);
	} catch (error) {
		console.error("Pusher auth error:", error);
		return NextResponse.json({ error: "Auth failed" }, { status: 500 });
	}
}
