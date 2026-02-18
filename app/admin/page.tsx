"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
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
	FileIcon,
	Download,
	ExternalLink,
	LogIn,
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

interface AdminFile {
	id: number;
	url: string;
	filename: string | null;
	room: string;
	uploadedBy: string;
	uploadedAt: string;
}

type TabType = "users" | "rooms" | "files";

export default function AdminPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [rooms, setRooms] = useState<AdminRoom[]>([]);
	const [files, setFiles] = useState<AdminFile[]>([]);
	const [loading, setLoading] = useState(true);
	const [tab, setTab] = useState<TabType>("users");
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	const fetchData = async () => {
		setLoading(true);
		try {
			const [usersRes, roomsRes, filesRes] = await Promise.all([
				fetch("/api/admin?resource=users"),
				fetch("/api/admin?resource=rooms"),
				fetch("/api/admin?resource=files"),
			]);
			const usersData = await usersRes.json();
			const roomsData = await roomsRes.json();
			const filesData = await filesRes.json();
			setUsers(usersData.users || []);
			setRooms(roomsData.rooms || []);
			setFiles(filesData.files || []);
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

	const formatDate = (iso: string) => {
		return new Date(iso).toLocaleString("en-IN", {
			timeZone: "Asia/Kolkata",
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatFileSize = (filename: string | null) => {
		// We don't have file size from blob, just show the extension
		if (!filename) return "Unknown";
		const ext = filename.split(".").pop()?.toUpperCase();
		return ext || "FILE";
	};

	const isImageFile = (filename: string | null) => {
		if (!filename) return false;
		return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(filename);
	};

	if (status === "loading" || loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="w-8 h-8 text-primary animate-spin" />
			</div>
		);
	}

	const tabConfig: {
		key: TabType;
		label: string;
		icon: React.ReactNode;
		count: number;
	}[] = [
		{
			key: "users",
			label: "Users",
			icon: <Users className="w-4 h-4" />,
			count: users.length,
		},
		{
			key: "rooms",
			label: "Rooms",
			icon: <Hash className="w-4 h-4" />,
			count: rooms.length,
		},
		{
			key: "files",
			label: "Files",
			icon: <FileIcon className="w-4 h-4" />,
			count: files.length,
		},
	];

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
							<p className="text-sm text-neutral-500">
								Manage users, rooms & files
							</p>
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
					{tabConfig.map((t) => (
						<button
							key={t.key}
							onClick={() => setTab(t.key)}
							className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
								tab === t.key
									? "bg-primary/10 text-primary border border-primary/20"
									: "text-neutral-400 hover:text-white hover:bg-white/5"
							}`}>
							{t.icon}
							{t.label}
							<span className="px-1.5 py-0.5 rounded-md bg-neutral-800 text-neutral-400 text-xs">
								{t.count}
							</span>
						</button>
					))}
				</div>

				{/* Content */}
				<AnimatePresence mode="wait">
					{tab === "users" && (
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
									{!u.isAdmin && (
										<div className="flex gap-1">
											<button
												onClick={async () => {
													setActionLoading(`login-${u.id}`);
													const res = await fetch("/api/admin", {
														method: "POST",
														headers: { "Content-Type": "application/json" },
														body: JSON.stringify({
															action: "loginAs",
															userId: u.id,
														}),
													});
													const data = await res.json();
													if (data.impersonationToken) {
														await signIn("credentials", {
															username: data.username,
															impersonationToken: data.impersonationToken,
															callbackUrl: "/",
														});
													}
													setActionLoading(null);
												}}
												disabled={actionLoading === `login-${u.id}`}
												className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
												title="Login as this user">
												{actionLoading === `login-${u.id}` ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													<LogIn className="w-4 h-4" />
												)}
											</button>
											<button
												onClick={() =>
													runAction(
														"deleteUser",
														{ userId: u.id },
														`del-user-${u.id}`,
													)
												}
												disabled={actionLoading === `del-user-${u.id}`}
												className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
												title="Delete user">
												{actionLoading === `del-user-${u.id}` ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													<Trash2 className="w-4 h-4" />
												)}
											</button>
										</div>
									)}
								</div>
							))}
							{users.length === 0 && (
								<p className="text-center text-neutral-500 py-8 text-sm">
									No users yet
								</p>
							)}
						</motion.div>
					)}

					{tab === "rooms" && (
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
							{rooms.length === 0 && (
								<p className="text-center text-neutral-500 py-8 text-sm">
									No rooms yet
								</p>
							)}
						</motion.div>
					)}

					{tab === "files" && (
						<motion.div
							key="files"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="space-y-2">
							{files.map((f) => (
								<div key={f.id} className="glass rounded-xl p-4">
									<div className="flex flex-col md:flex-row md:items-center gap-3">
										<div className="flex items-center gap-3 flex-1 min-w-0">
											{/* Thumbnail or icon */}
											{isImageFile(f.filename) ? (
												<div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
													<img
														src={f.url}
														alt={f.filename || "image"}
														className="w-full h-full object-cover"
													/>
												</div>
											) : (
												<div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
													<FileIcon className="w-4 h-4 text-primary" />
												</div>
											)}

											<div className="min-w-0 flex-1">
												<p className="font-medium text-white text-sm truncate">
													{f.filename || "Unnamed file"}
												</p>
												<div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5 flex-wrap">
													<span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[10px] font-medium uppercase">
														{formatFileSize(f.filename)}
													</span>
													<span>by {f.uploadedBy}</span>
													<span className="flex items-center gap-1">
														<Hash className="w-3 h-3" />
														{f.room}
													</span>
													<span>{formatDate(f.uploadedAt)}</span>
												</div>
											</div>
										</div>

										<div className="flex gap-2 flex-shrink-0">
											<a
												href={f.url}
												target="_blank"
												rel="noopener noreferrer"
												className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
												title="Open">
												<ExternalLink className="w-4 h-4" />
											</a>
											<a
												href={f.url}
												download={f.filename || "file"}
												className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
												title="Download">
												<Download className="w-4 h-4" />
											</a>
											<button
												onClick={() =>
													runAction(
														"deleteFile",
														{ fileId: f.id },
														`del-file-${f.id}`,
													)
												}
												disabled={actionLoading === `del-file-${f.id}`}
												className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
												title="Delete">
												{actionLoading === `del-file-${f.id}` ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													<Trash2 className="w-4 h-4" />
												)}
											</button>
										</div>
									</div>
								</div>
							))}
							{files.length === 0 && (
								<p className="text-center text-neutral-500 py-8 text-sm">
									No files uploaded yet
								</p>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
