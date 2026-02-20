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

/**
 * Safely triggers a Pusher event with exponential backoff retries.
 * Fire-and-forget: it does not block the main execution thread.
 */
export function triggerPusher(
	channel: string | string[],
	event: string,
	data: any,
	retries = 3,
	delayMs = 500,
) {
	const attempt = async (currentAttempt = 1) => {
		try {
			await pusherServer.trigger(channel, event, data);
		} catch (error) {
			console.error(`Pusher trigger error (attempt ${currentAttempt}):`, error);
			if (currentAttempt < retries) {
				setTimeout(() => attempt(currentAttempt + 1), delayMs * currentAttempt);
			} else {
				console.error(
					`[DLQ] Pusher failed to deliver event ${event} to ${channel} after ${retries} attempts.`,
				);
			}
		}
	};

	attempt().catch((err) =>
		console.error("Unhandled error in triggerPusher:", err),
	);
}
