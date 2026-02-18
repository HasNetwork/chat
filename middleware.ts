import { withAuth } from "next-auth/middleware";

export default withAuth({
	pages: {
		signIn: "/login",
	},
});

export const config = {
	matcher: [
		"/",
		"/admin/:path*",
		"/api/rooms/:path*",
		"/api/messages/:path*",
		"/api/upload/:path*",
		"/api/admin/:path*",
		"/api/pusher/:path*",
	],
};
