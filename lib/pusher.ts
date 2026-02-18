import Pusher from "pusher";

const globalForPusher = globalThis as unknown as {
	pusher: Pusher | undefined;
};

export const pusherServer =
	globalForPusher.pusher ??
	new Pusher({
		appId: process.env.PUSHER_APP_ID!,
		key: process.env.PUSHER_KEY!,
		secret: process.env.PUSHER_SECRET!,
		cluster: process.env.PUSHER_CLUSTER!,
		useTLS: true,
	});

if (process.env.NODE_ENV !== "production")
	globalForPusher.pusher = pusherServer;

// Channel naming conventions
export function roomChannel(roomName: string) {
	// Replace characters that Pusher doesn't allow in channel names
	const sanitized = roomName.replace(/[^a-zA-Z0-9_\-=@,.;]/g, "_");
	return `private-room-${sanitized}`;
}

// Event name constants
export const PUSHER_EVENTS = {
	NEW_MESSAGE: "new-message",
	MESSAGE_EDITED: "message-edited",
	MESSAGE_DELETED: "message-deleted",
	MESSAGE_REACTED: "message-reacted",
	MESSAGE_SEEN: "message-seen",
	TYPING: "client-typing",
	USER_STATUS: "user-status",
} as const;
