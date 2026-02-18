"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { usePusher } from "@/components/providers/pusher-provider";
import { motion, AnimatePresence } from "framer-motion";
import {
	MessageSquare,
	Plus,
	Send,
	Paperclip,
	LogOut,
	Hash,
	Menu,
	X,
	Smile,
	Edit3,
	Trash2,
	Reply,
	Check,
	CheckCheck,
	Loader2,
	Shield,
	File as FileIcon,
	Download,
} from "lucide-react";

// ─── Types ───
interface MessageData {
	id: number;
	user: string;
	message: string;
	is_file: boolean;
	filename: string | null;
	url: string | null;
	timestamp: string;
	parent_id: number | null;
	is_deleted: boolean;
	edited_at: string | null;
	reactions: { emoji: string; user: string }[];
	seen_by: string[];
}

// ─── IST Helpers ───
function toIST(isoString: string) {
	const d = new Date(isoString);
	return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function toISTTime(isoString: string) {
	const d = new Date(isoString);
	return d.toLocaleTimeString("en-IN", {
		timeZone: "Asia/Kolkata",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

function toISTDate(isoString: string) {
	const d = new Date(isoString);
	return d.toLocaleDateString("en-IN", {
		timeZone: "Asia/Kolkata",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

// ─── Emoji Picker ───
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👏"];

function EmojiPicker({
	onSelect,
	onClose,
}: {
	onSelect: (emoji: string) => void;
	onClose: () => void;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.9 }}
			className="absolute bottom-full mb-1 right-0 flex gap-1 p-2 rounded-xl glass z-50">
			{QUICK_EMOJIS.map((e) => (
				<button
					key={e}
					onClick={() => {
						onSelect(e);
						onClose();
					}}
					className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-base">
					{e}
				</button>
			))}
		</motion.div>
	);
}

// ─── Message Bubble ───
function MessageBubble({
	msg,
	isOwn,
	username,
	onReact,
	onEdit,
	onDelete,
	onReply,
	parentMsg,
}: {
	msg: MessageData;
	isOwn: boolean;
	username: string;
	onReact: (id: number, emoji: string) => void;
	onEdit: (msg: MessageData) => void;
	onDelete: (id: number) => void;
	onReply: (msg: MessageData) => void;
	parentMsg: MessageData | undefined;
}) {
	const [showEmoji, setShowEmoji] = useState(false);
	const [showActions, setShowActions] = useState(false);

	if (msg.is_deleted) {
		return (
			<div
				className={`flex ${isOwn ? "justify-end" : "justify-start"} group mb-1`}>
				<div className="max-w-md px-4 py-2 rounded-2xl bg-neutral-900/40 border border-neutral-800/50">
					<p className="text-neutral-500 italic text-sm">
						This message was deleted
					</p>
				</div>
			</div>
		);
	}

	const groupedReactions = msg.reactions.reduce(
		(acc: Record<string, string[]>, r) => {
			if (!acc[r.emoji]) acc[r.emoji] = [];
			acc[r.emoji].push(r.user);
			return acc;
		},
		{},
	);

	return (
		<div
			className={`flex ${isOwn ? "justify-end" : "justify-start"} group mb-1`}
			onMouseEnter={() => setShowActions(true)}
			onMouseLeave={() => {
				setShowActions(false);
				setShowEmoji(false);
			}}>
			<div className="relative max-w-md">
				{/* Reply reference */}
				{parentMsg && (
					<div
						className={`mb-1 px-3 py-1.5 rounded-lg text-xs border-l-2 border-primary/50 ${
							isOwn ? "bg-primary/5 ml-auto" : "bg-neutral-800/50"
						}`}>
						<span className="text-primary/70 font-medium">
							{parentMsg.user}
						</span>
						<p className="text-neutral-400 truncate">
							{parentMsg.is_deleted
								? "Deleted message"
								: parentMsg.message.substring(0, 60)}
						</p>
					</div>
				)}

				<div
					className={`px-4 py-2.5 rounded-2xl ${
						isOwn
							? "bg-primary/15 border border-primary/20"
							: "bg-neutral-900/60 border border-neutral-800/50"
					}`}>
					{/* Sender name (for others' messages) */}
					{!isOwn && (
						<p className="text-xs font-semibold text-primary/80 mb-0.5">
							{msg.user}
						</p>
					)}

					{/* Content */}
					{msg.is_file ? (
						<a
							href={msg.url!}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5 hover:border-primary/30 transition-all group/file">
							<div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
								<FileIcon className="w-5 h-5 text-primary" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-white truncate">
									{msg.filename}
								</p>
								<p className="text-xs text-neutral-500">Click to download</p>
							</div>
							<Download className="w-4 h-4 text-neutral-500 group-hover/file:text-primary transition-colors" />
						</a>
					) : (
						<p className="text-sm text-neutral-100 whitespace-pre-wrap break-words">
							{msg.message}
						</p>
					)}

					{/* Bottom row: time + edit + seen */}
					<div className="flex items-center justify-end gap-1.5 mt-1">
						{msg.edited_at && (
							<span className="text-[10px] text-neutral-500">edited</span>
						)}
						<span className="text-[10px] text-neutral-500">
							{toISTTime(msg.timestamp)}
						</span>
						{isOwn && msg.seen_by.length > 0 && (
							<CheckCheck className="w-3 h-3 text-primary/60" />
						)}
					</div>
				</div>

				{/* Reactions */}
				{Object.keys(groupedReactions).length > 0 && (
					<div className="flex flex-wrap gap-1 mt-1">
						{Object.entries(groupedReactions).map(([emoji, users]) => (
							<button
								key={emoji}
								onClick={() => onReact(msg.id, emoji)}
								className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border transition-colors ${
									users.includes(username)
										? "bg-primary/10 border-primary/30 text-primary"
										: "bg-neutral-900/60 border-neutral-800/50 text-neutral-400 hover:border-neutral-700"
								}`}
								title={users.join(", ")}>
								<span>{emoji}</span>
								<span>{users.length}</span>
							</button>
						))}
					</div>
				)}

				{/* Action buttons */}
				<AnimatePresence>
					{showActions && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className={`absolute top-0 ${
								isOwn
									? "left-0 -translate-x-full pl-1"
									: "right-0 translate-x-full pr-1"
							} flex items-center gap-0.5`}>
							<button
								onClick={() => onReply(msg)}
								className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-500 hover:text-neutral-300 transition-colors"
								title="Reply">
								<Reply className="w-3.5 h-3.5" />
							</button>
							<div className="relative">
								<button
									onClick={() => setShowEmoji(!showEmoji)}
									className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-500 hover:text-neutral-300 transition-colors"
									title="React">
									<Smile className="w-3.5 h-3.5" />
								</button>
								<AnimatePresence>
									{showEmoji && (
										<EmojiPicker
											onSelect={(emoji) => onReact(msg.id, emoji)}
											onClose={() => setShowEmoji(false)}
										/>
									)}
								</AnimatePresence>
							</div>
							{isOwn && !msg.is_file && (
								<button
									onClick={() => onEdit(msg)}
									className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-500 hover:text-neutral-300 transition-colors"
									title="Edit">
									<Edit3 className="w-3.5 h-3.5" />
								</button>
							)}
							{isOwn && (
								<button
									onClick={() => onDelete(msg.id)}
									className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-500 hover:text-red-400 transition-colors"
									title="Delete">
									<Trash2 className="w-3.5 h-3.5" />
								</button>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}

// ─── Main Chat Component ───
export default function ChatPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const { subscribe, unsubscribe } = usePusher();

	// State
	const [rooms, setRooms] = useState<string[]>([]);
	const [currentRoom, setCurrentRoom] = useState<string | null>(null);
	const [messages, setMessages] = useState<MessageData[]>([]);
	const [input, setInput] = useState("");
	const [newRoom, setNewRoom] = useState("");
	const [showNewRoom, setShowNewRoom] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [editingMsg, setEditingMsg] = useState<MessageData | null>(null);
	const [replyTo, setReplyTo] = useState<MessageData | null>(null);
	const [loading, setLoading] = useState(false);
	const [uploading, setUploading] = useState(false);

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const username = session?.user?.username ?? "";

	// ─── Scroll to bottom ───
	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages, scrollToBottom]);

	// ─── Load rooms ───
	useEffect(() => {
		if (status !== "authenticated") return;

		const loadRooms = async () => {
			const res = await fetch("/api/rooms");
			const data = await res.json();
			setRooms(data.rooms || []);
			if (data.rooms?.length > 0 && !currentRoom) {
				setCurrentRoom(data.rooms[0]);
			}
		};

		loadRooms();
	}, [status]);

	// ─── Load messages for current room ───
	useEffect(() => {
		if (!currentRoom) return;

		const loadMessages = async () => {
			setLoading(true);
			const res = await fetch(
				`/api/messages?room=${encodeURIComponent(currentRoom)}`,
			);
			const data = await res.json();
			setMessages(data.messages || []);
			setLoading(false);
		};

		loadMessages();
	}, [currentRoom]);

	// ─── Pusher subscription ───
	useEffect(() => {
		if (!currentRoom) return;

		const sanitized = currentRoom.replace(/[^a-zA-Z0-9_\-=@,.;]/g, "_");
		const channelName = `private-room-${sanitized}`;

		const channel = subscribe(channelName);
		if (!channel) return;

		channel.bind("new-message", (data: MessageData) => {
			setMessages((prev) => [...prev, data]);
		});

		channel.bind(
			"message-edited",
			(data: {
				message_id: number;
				new_content: string;
				edited_at: string;
			}) => {
				setMessages((prev) =>
					prev.map((m) =>
						m.id === data.message_id
							? { ...m, message: data.new_content, edited_at: data.edited_at }
							: m,
					),
				);
			},
		);

		channel.bind("message-deleted", (data: { message_id: number }) => {
			setMessages((prev) =>
				prev.map((m) =>
					m.id === data.message_id ? { ...m, is_deleted: true } : m,
				),
			);
		});

		channel.bind(
			"message-reacted",
			(data: {
				message_id: number;
				reactions: { emoji: string; user: string }[];
			}) => {
				setMessages((prev) =>
					prev.map((m) =>
						m.id === data.message_id ? { ...m, reactions: data.reactions } : m,
					),
				);
			},
		);

		channel.bind(
			"message-seen",
			(data: { message_id: number; seen_by: string[] }) => {
				setMessages((prev) =>
					prev.map((m) =>
						m.id === data.message_id ? { ...m, seen_by: data.seen_by } : m,
					),
				);
			},
		);

		return () => {
			unsubscribe(channelName);
		};
	}, [currentRoom, subscribe, unsubscribe]);

	// ─── Handlers ───
	const joinRoom = async (roomName: string) => {
		await fetch("/api/rooms", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: roomName }),
		});
		setCurrentRoom(roomName);
		if (!rooms.includes(roomName)) {
			setRooms((prev) => [...prev, roomName]);
		}
		// Close sidebar on mobile
		if (window.innerWidth < 768) setSidebarOpen(false);
	};

	const sendMessage = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() || !currentRoom) return;

		if (editingMsg) {
			await fetch(`/api/messages/${editingMsg.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: input.trim() }),
			});
			setEditingMsg(null);
		} else {
			await fetch("/api/messages", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					room: currentRoom,
					message: input.trim(),
					parent_id: replyTo?.id ?? null,
				}),
			});
			setReplyTo(null);
		}

		setInput("");
		inputRef.current?.focus();
	};

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !currentRoom) return;

		setUploading(true);

		const formData = new FormData();
		formData.append("file", file);
		formData.append("room", currentRoom);

		await fetch("/api/upload", {
			method: "POST",
			body: formData,
		});

		setUploading(false);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleReact = async (messageId: number, emoji: string) => {
		await fetch(`/api/messages/${messageId}/react`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ emoji }),
		});
	};

	const handleDelete = async (messageId: number) => {
		await fetch(`/api/messages/${messageId}`, { method: "DELETE" });
	};

	const handleCreateRoom = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newRoom.trim()) return;
		await joinRoom(newRoom.trim());
		setNewRoom("");
		setShowNewRoom(false);
	};

	// ─── Loading ───
	if (status === "loading") {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="w-8 h-8 text-primary animate-spin" />
			</div>
		);
	}

	// ─── Date Separator Logic ───
	const getDateSeparator = (idx: number) => {
		if (idx === 0) return toISTDate(messages[0].timestamp);
		const prev = toISTDate(messages[idx - 1].timestamp);
		const curr = toISTDate(messages[idx].timestamp);
		return prev !== curr ? curr : null;
	};

	return (
		<div className="h-screen flex overflow-hidden bg-background">
			{/* ─── Sidebar ─── */}
			<AnimatePresence>
				{sidebarOpen && (
					<motion.aside
						initial={{ x: -300, opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						exit={{ x: -300, opacity: 0 }}
						transition={{ type: "spring", damping: 25, stiffness: 300 }}
						className="w-72 h-full flex flex-col border-r border-neutral-800/50 bg-neutral-950/80 backdrop-blur-xl fixed md:relative z-40">
						{/* Sidebar Header */}
						<div className="p-4 border-b border-neutral-800/50">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
										<MessageSquare className="w-4 h-4 text-primary" />
									</div>
									<h2 className="font-bold text-white">HaS Chat</h2>
								</div>
								<button
									onClick={() => setSidebarOpen(false)}
									className="md:hidden p-1.5 rounded-lg hover:bg-white/10 text-neutral-400">
									<X className="w-5 h-5" />
								</button>
							</div>
						</div>

						{/* Room List */}
						<div className="flex-1 overflow-y-auto p-3 space-y-1">
							<div className="flex items-center justify-between px-2 mb-2">
								<span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
									Rooms
								</span>
								<button
									onClick={() => setShowNewRoom(!showNewRoom)}
									className="p-1 rounded-md hover:bg-white/10 text-neutral-500 hover:text-white transition-colors">
									<Plus className="w-4 h-4" />
								</button>
							</div>

							<AnimatePresence>
								{showNewRoom && (
									<motion.form
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: "auto", opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										onSubmit={handleCreateRoom}
										className="overflow-hidden">
										<input
											value={newRoom}
											onChange={(e) => setNewRoom(e.target.value)}
											className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary/50 mb-1"
											placeholder="Room name..."
											autoFocus
										/>
									</motion.form>
								)}
							</AnimatePresence>

							{rooms.map((room) => (
								<button
									key={room}
									onClick={() => joinRoom(room)}
									className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
										currentRoom === room
											? "bg-primary/10 text-primary border border-primary/20"
											: "text-neutral-400 hover:text-white hover:bg-white/5"
									}`}>
									<Hash className="w-4 h-4 flex-shrink-0" />
									<span className="truncate">{room}</span>
								</button>
							))}
						</div>

						{/* Sidebar Footer */}
						<div className="p-3 border-t border-neutral-800/50">
							{session?.user?.isAdmin && (
								<button
									onClick={() => router.push("/admin")}
									className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-all mb-1">
									<Shield className="w-4 h-4" />
									Admin Panel
								</button>
							)}
							<button
								onClick={() => signOut({ callbackUrl: "/login" })}
								className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-red-400 hover:bg-red-500/5 transition-all">
								<LogOut className="w-4 h-4" />
								Sign Out
							</button>
							<div className="flex items-center gap-2 px-3 py-2 mt-1">
								<div className="w-2 h-2 rounded-full bg-green-500" />
								<span className="text-xs text-neutral-500">{username}</span>
							</div>
						</div>
					</motion.aside>
				)}
			</AnimatePresence>

			{/* Mobile overlay */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			{/* ─── Main Chat Area ─── */}
			<main className="flex-1 flex flex-col min-w-0">
				{/* Chat Header */}
				<header className="h-14 flex items-center px-4 border-b border-neutral-800/50 bg-neutral-950/80 backdrop-blur-xl flex-shrink-0">
					<button
						onClick={() => setSidebarOpen(true)}
						className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 mr-2 md:hidden">
						<Menu className="w-5 h-5" />
					</button>
					{!sidebarOpen && (
						<button
							onClick={() => setSidebarOpen(true)}
							className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 mr-2 hidden md:block">
							<Menu className="w-5 h-5" />
						</button>
					)}
					{currentRoom ? (
						<div className="flex items-center gap-2">
							<Hash className="w-5 h-5 text-primary" />
							<h1 className="font-semibold text-white">{currentRoom}</h1>
						</div>
					) : (
						<h1 className="text-neutral-500">Select a room</h1>
					)}
				</header>

				{/* Messages Area */}
				<div className="flex-1 overflow-y-auto p-4 space-y-2">
					{!currentRoom ? (
						<div className="h-full flex items-center justify-center">
							<div className="text-center">
								<MessageSquare className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
								<p className="text-neutral-500">
									Select a room or create one to start chatting
								</p>
							</div>
						</div>
					) : loading ? (
						<div className="h-full flex items-center justify-center">
							<Loader2 className="w-8 h-8 text-primary animate-spin" />
						</div>
					) : messages.length === 0 ? (
						<div className="h-full flex items-center justify-center">
							<div className="text-center">
								<Hash className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
								<p className="text-neutral-500">
									No messages yet. Say something!
								</p>
							</div>
						</div>
					) : (
						messages.map((msg, idx) => {
							const separator = getDateSeparator(idx);
							return (
								<div key={msg.id}>
									{separator && (
										<div className="flex items-center gap-4 my-4">
											<div className="flex-1 h-px bg-neutral-800" />
											<span className="text-xs text-neutral-500 font-medium">
												{separator}
											</span>
											<div className="flex-1 h-px bg-neutral-800" />
										</div>
									)}
									<MessageBubble
										msg={msg}
										isOwn={msg.user === username}
										username={username}
										onReact={handleReact}
										onEdit={(m) => {
											setEditingMsg(m);
											setInput(m.message);
											inputRef.current?.focus();
										}}
										onDelete={handleDelete}
										onReply={(m) => {
											setReplyTo(m);
											inputRef.current?.focus();
										}}
										parentMsg={
											msg.parent_id
												? messages.find((m) => m.id === msg.parent_id)
												: undefined
										}
									/>
								</div>
							);
						})
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Reply / Edit Bar */}
				<AnimatePresence>
					{(replyTo || editingMsg) && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							className="border-t border-neutral-800/50 bg-neutral-950/60 px-4 py-2 flex items-center gap-2">
							<div className="flex-1 min-w-0">
								<span className="text-xs text-primary font-medium">
									{editingMsg ? "Editing message" : `Reply to ${replyTo!.user}`}
								</span>
								<p className="text-xs text-neutral-500 truncate">
									{editingMsg?.message || replyTo?.message}
								</p>
							</div>
							<button
								onClick={() => {
									setEditingMsg(null);
									setReplyTo(null);
									setInput("");
								}}
								className="p-1 rounded-md hover:bg-white/10 text-neutral-500">
								<X className="w-4 h-4" />
							</button>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Input Area */}
				{currentRoom && (
					<form
						onSubmit={sendMessage}
						className="p-4 border-t border-neutral-800/50 bg-neutral-950/80 backdrop-blur-xl flex-shrink-0">
						<div className="flex items-center gap-2">
							{/* File upload */}
							<input
								ref={fileInputRef}
								type="file"
								className="hidden"
								onChange={handleFileUpload}
							/>
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								disabled={uploading}
								className="p-2.5 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition-colors disabled:opacity-50">
								{uploading ? (
									<Loader2 className="w-5 h-5 animate-spin" />
								) : (
									<Paperclip className="w-5 h-5" />
								)}
							</button>

							{/* Text input */}
							<input
								ref={inputRef}
								value={input}
								onChange={(e) => setInput(e.target.value)}
								placeholder={
									editingMsg
										? "Edit your message..."
										: `Message #${currentRoom}...`
								}
								className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm"
							/>

							{/* Send button */}
							<button
								type="submit"
								disabled={!input.trim()}
								className="p-2.5 rounded-xl bg-primary hover:bg-primary/90 active:scale-95 text-white transition-all disabled:opacity-30 disabled:hover:bg-primary">
								{editingMsg ? (
									<Check className="w-5 h-5" />
								) : (
									<Send className="w-5 h-5" />
								)}
							</button>
						</div>
					</form>
				)}
			</main>
		</div>
	);
}
