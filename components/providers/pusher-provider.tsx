"use client";

import PusherClient from "pusher-js";
import { useSession } from "next-auth/react";
import { createContext, useContext, useEffect, useState, useRef } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
type PusherContextType = {
	client: PusherClient | null;
	subscribe: (channelName: string) => any;
	unsubscribe: (channelName: string) => void;
};

const PusherContext = createContext<PusherContextType>({
	client: null,
	subscribe: () => null,
	unsubscribe: () => {},
});

export function PusherProvider({ children }: { children: React.ReactNode }) {
	const { data: session } = useSession();
	const [client, setClient] = useState<PusherClient | null>(null);
	const clientRef = useRef<PusherClient | null>(null);

	useEffect(() => {
		if (!session?.user) return;

		// Don't create a new client if one already exists
		if (clientRef.current) return;

		const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
			cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
			authEndpoint: "/api/pusher/auth",
		});

		clientRef.current = pusher;
		setClient(pusher);

		return () => {
			pusher.disconnect();
			clientRef.current = null;
		};
	}, [session]);

	const subscribe = (channelName: string) => {
		if (!clientRef.current) return null;
		return clientRef.current.subscribe(channelName);
	};

	const unsubscribe = (channelName: string) => {
		if (!clientRef.current) return;
		clientRef.current.unsubscribe(channelName);
	};

	return (
		<PusherContext.Provider value={{ client, subscribe, unsubscribe }}>
			{children}
		</PusherContext.Provider>
	);
}

export const usePusher = () => useContext(PusherContext);
