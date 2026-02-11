import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Check for NextAuth session via getToken (more secure than just cookie presence)
    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET
    });

    const isAuth = !!token;
    const isAuthPage = pathname === "/login";
    const isDashboardPage = pathname.startsWith("/dashboard");

    // Protect dashboard routes
    if (isDashboardPage && !isAuth) {
        let callbackUrl = pathname;
        if (req.nextUrl.search) {
            callbackUrl += req.nextUrl.search;
        }

        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", callbackUrl);
        return NextResponse.redirect(loginUrl);
    }

    // Redirect authenticated users from login to dashboard
    if (isAuthPage && isAuth) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/login"],
};
