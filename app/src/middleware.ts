import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    // Check for NextAuth session cookie (standard name)
    const sessionCookie = req.cookies.get("next-auth.session-token") || req.cookies.get("__Secure-next-auth.session-token");

    // Protect dashboard routes
    if (pathname.startsWith("/dashboard")) {
        if (!sessionCookie) {
            const loginUrl = new URL("/login", req.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    // Redirect authenticated users from login to dashboard
    if (pathname === "/login" && sessionCookie) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/login"],
};
