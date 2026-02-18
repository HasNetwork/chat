"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
	Shield,
	Users,
	Hash,
	Trash2,
	ArrowLeft,
	Loader2,
	MessageSquare,
	RefreshCw,
} from "lucide-react";

interface AdminUser {
	id: number;
	username: string;
	isAdmin: boolean;
	online: boolean;
	rooms: string[];
}

interface AdminRoom {
	name: string;
	users: { id: number; username: string }[];
	messageCount: number;
}

export default function AdminPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [rooms, setRooms] = useState<AdminRoom[]>([]);
	const [loading, setLoading] = useState(true);
	const [tab, setTab] = useState<"users" | "rooms">("users");
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	const fetchData = async () => {
		setLoading(true);
		try {
			const [usersRes, roomsRes] = await Promise.all([
				fetch("/api/admin?resource=users"),
				fetch("/api/admin?resource=rooms"),
			]);
			const usersData = await usersRes.json();
			const roomsData = await roomsRes.json();
			setUsers(usersData.users || []);
			setRooms(roomsData.rooms || []);
		} catch (err) {
			console.error("Admin fetch error:", err);
		}
		setLoading(false);
	};

	useEffect(() => {
		if (status === "authenticated") {
			if (!session?.user?.isAdmin) {
				router.push("/");
				return;
			}
			fetchData();
		}
	}, [status]);

	const runAction = async (
		action: string,
		payload: Record<string, unknown>,
		key: string,
	) => {
		setActionLoading(key);
		await fetch("/api/admin", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action, ...payload }),
		});
		await fetchData();
		setActionLoading(null);
	};

	if (status === "loading" || loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="w-8 h-8 text-primary animate-spin" />
			</div>
		);
	}

	return (
		<div className="min-h-screen p-4 md:p-8 bg-background">
			<div className="max-w-5xl mx-auto">
				{/* Header */}
				<div className="flex items-center gap-4 mb-8">
					<button
						onClick={() => router.push("/")}
						className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 transition-colors">
						<ArrowLeft className="w-5 h-5" />
					</button>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
							<Shield className="w-5 h-5 text-primary" />
						</div>
						<div>
							<h1 className="text-xl font-bold text-white">Admin Panel</h1>
							<p className="text-sm text-neutral-500">Manage users and rooms</p>
						</div>
					</div>
					<button
						onClick={fetchData}
						className="ml-auto p-2 rounded-lg hover:bg-white/10 text-neutral-400 transition-colors"
						title="Refresh">
						<RefreshCw className="w-5 h-5" />
					</button>
				</div>

				{/* Tabs */}
				<div className="flex gap-2 mb-6">
					{(["users", "rooms"] as const).map((t) => (
						<button
							key={t}
							onClick={() => setTab(t)}
							className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
								tab === t
									? "bg-primary/10 text-primary border border-primary/20"
									: "text-neutral-400 hover:text-white hover:bg-white/5"
							}`}>
							{t === "users" ? (
								<Users className="w-4 h-4" />
							) : (
								<Hash className="w-4 h-4" />
							)}
							{t.charAt(0).toUpperCase() + t.slice(1)}
							<span className="px-1.5 py-0.5 rounded-md bg-neutral-800 text-neutral-400 text-xs">
								{t === "users" ? users.length : rooms.length}
							</span>
						</button>
					))}
				</div>

				{/* Content */}
				<AnimatePresence mode="wait">
					{tab === "users" ? (
						<motion.div
							key="users"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="space-y-2">
							{users.map((u) => (
								<div
									key={u.id}
									className="glass rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3">
									<div className="flex items-center gap-3 flex-1">
										<div
											className={`w-2 h-2 rounded-full ${
												u.online ? "bg-green-500" : "bg-neutral-600"
											}`}
										/>
										<div>
											<div className="flex items-center gap-2">
												<span className="font-medium text-white text-sm">
													{u.username}
												</span>
												{u.isAdmin && (
													<span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
														ADMIN
													</span>
												)}
											</div>
											<p className="text-xs text-neutral-500">
												{u.rooms.length > 0
													? `Rooms: ${u.rooms.join(", ")}`
													: "No rooms joined"}
											</p>
										</div>
									</div>
								</div>
							))}
						</motion.div>
					) : (
						<motion.div
							key="rooms"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="space-y-2">
							{rooms.map((r) => (
								<div key={r.name} className="glass rounded-xl p-4">
									<div className="flex flex-col md:flex-row md:items-center gap-3">
										<div className="flex items-center gap-3 flex-1">
											<Hash className="w-4 h-4 text-primary flex-shrink-0" />
											<div>
												<span className="font-medium text-white text-sm">
													{r.name}
												</span>
												<div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
													<span className="flex items-center gap-1">
														<MessageSquare className="w-3 h-3" />
														{r.messageCount} messages
													</span>
													<span className="flex items-center gap-1">
														<Users className="w-3 h-3" />
														{r.users.length} members
													</span>
												</div>
											</div>
										</div>
										<div className="flex gap-2">
											<button
												onClick={() =>
													runAction(
														"clearRoom",
														{ roomName: r.name },
														`clear-${r.name}`,
													)
												}
												disabled={actionLoading === `clear-${r.name}`}
												className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-all disabled:opacity-50">
												{actionLoading === `clear-${r.name}` ? (
													<Loader2 className="w-3 h-3 animate-spin" />
												) : (
													"Clear"
												)}
											</button>
											<button
												onClick={() =>
													runAction(
														"deleteRoom",
														{ roomName: r.name },
														`del-${r.name}`,
													)
												}
												disabled={actionLoading === `del-${r.name}`}
												className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all disabled:opacity-50">
												{actionLoading === `del-${r.name}` ? (
													<Loader2 className="w-3 h-3 animate-spin" />
												) : (
													<Trash2 className="w-3 h-3" />
												)}
											</button>
										</div>
									</div>
								</div>
							))}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
