import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
	try {
		const { username, password } = await req.json();

		if (!username || !password) {
			return NextResponse.json(
				{ error: "Username and password are required" },
				{ status: 400 },
			);
		}

		if (username.length < 2 || username.length > 50) {
			return NextResponse.json(
				{ error: "Username must be between 2 and 50 characters" },
				{ status: 400 },
			);
		}

		if (password.length < 4) {
			return NextResponse.json(
				{ error: "Password must be at least 4 characters" },
				{ status: 400 },
			);
		}

		const existingUser = await db.user.findUnique({
			where: { username },
		});

		if (existingUser) {
			return NextResponse.json(
				{ error: "Username already exists" },
				{ status: 409 },
			);
		}

		// First user becomes admin
		const userCount = await db.user.count();
		const isAdmin = userCount === 0;

		const passwordHash = await hash(password, 12);

		const user = await db.user.create({
			data: {
				username,
				passwordHash,
				isAdmin,
			},
		});

		return NextResponse.json(
			{
				message: isAdmin
					? "Account created! You are the admin."
					: "Account created! Please log in.",
				isAdmin,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Registration error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
