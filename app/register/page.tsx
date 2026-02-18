"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquare, UserPlus, Loader2 } from "lucide-react";

export default function RegisterPage() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSuccess("");
		setLoading(true);

		try {
			const res = await fetch("/api/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, password }),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(data.error);
			} else {
				setSuccess(data.message);
				setTimeout(() => router.push("/login"), 1500);
			}
		} catch {
			setError("Something went wrong. Try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="fixed inset-0 bg-gradient-to-br from-neutral-950 via-neutral-950 to-blue-950/20" />

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="w-full max-w-md relative z-10">
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
						<MessageSquare className="w-7 h-7 text-primary" />
					</div>
					<h1 className="text-2xl font-bold text-white">Create Account</h1>
					<p className="text-muted-foreground mt-1">Join HaS Chat</p>
				</div>

				<div className="glass rounded-2xl p-8">
					{error && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
							{error}
						</motion.div>
					)}

					{success && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
							{success}
						</motion.div>
					)}

					<form onSubmit={handleSubmit} className="space-y-5">
						<div className="space-y-2">
							<label
								htmlFor="username"
								className="text-sm font-medium text-neutral-300">
								Username
							</label>
							<input
								id="username"
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								className="w-full px-4 py-3 rounded-xl bg-neutral-900/80 border border-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
								placeholder="Choose a username"
								required
								minLength={2}
								maxLength={50}
								autoComplete="username"
							/>
						</div>

						<div className="space-y-2">
							<label
								htmlFor="password"
								className="text-sm font-medium text-neutral-300">
								Password
							</label>
							<input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full px-4 py-3 rounded-xl bg-neutral-900/80 border border-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
								placeholder="Choose a password"
								required
								minLength={4}
								autoComplete="new-password"
							/>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50">
							{loading ? (
								<Loader2 className="w-5 h-5 animate-spin" />
							) : (
								<UserPlus className="w-5 h-5" />
							)}
							{loading ? "Creating account..." : "Create Account"}
						</button>
					</form>
				</div>

				<p className="text-center mt-6 text-neutral-400 text-sm">
					Already have an account?{" "}
					<Link
						href="/login"
						className="text-primary hover:text-primary/80 font-medium transition-colors">
						Sign in
					</Link>
				</p>
			</motion.div>
		</div>
	);
}
