"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquare, LogIn, Loader2 } from "lucide-react";

export default function LoginPage() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [remember, setRemember] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		const result = await signIn("credentials", {
			username,
			password,
			redirect: false,
		});

		setLoading(false);

		if (result?.error) {
			setError("Invalid username or password");
		} else {
			router.push("/");
			router.refresh();
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			{/* Subtle background gradient */}
			<div className="fixed inset-0 bg-gradient-to-br from-neutral-950 via-neutral-950 to-blue-950/20" />

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="w-full max-w-md relative z-10">
				{/* Logo / Brand */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
						<MessageSquare className="w-7 h-7 text-primary" />
					</div>
					<h1 className="text-2xl font-bold text-white">Welcome back</h1>
					<p className="text-muted-foreground mt-1">Sign in to HaS Chat</p>
				</div>

				{/* Card */}
				<div className="glass rounded-2xl p-8">
					{error && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
							{error}
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
								placeholder="Enter your username"
								required
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
								placeholder="Enter your password"
								required
								autoComplete="current-password"
							/>
						</div>

						<div className="flex items-center gap-2">
							<input
								id="remember"
								type="checkbox"
								checked={remember}
								onChange={(e) => setRemember(e.target.checked)}
								className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-primary focus:ring-primary/50"
							/>
							<label htmlFor="remember" className="text-sm text-neutral-400">
								Remember me
							</label>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50">
							{loading ? (
								<Loader2 className="w-5 h-5 animate-spin" />
							) : (
								<LogIn className="w-5 h-5" />
							)}
							{loading ? "Signing in..." : "Sign In"}
						</button>
					</form>
				</div>

				<p className="text-center mt-6 text-neutral-400 text-sm">
					Don&apos;t have an account?{" "}
					<Link
						href="/register"
						className="text-primary hover:text-primary/80 font-medium transition-colors">
						Create one
					</Link>
				</p>
			</motion.div>
		</div>
	);
}
