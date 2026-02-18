"use client";

import { PusherProvider } from "@/components/providers/pusher-provider";
import ChatPage from "@/components/chat/chat-page";

export default function Home() {
	return (
		<PusherProvider>
			<ChatPage />
		</PusherProvider>
	);
}
