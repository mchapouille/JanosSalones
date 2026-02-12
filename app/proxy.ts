import { auth } from "@/auth";
import { NextResponse } from "next/server";

const proxyHandler = auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;

    // Canonical redirect to hide Vercel usernames in the address bar
    const host = req.headers.get("host");
    const PRODUCTION_DOMAIN = "janossalones.vercel.app";

    // Detect Vercel environment more reliably
    const isVercelPreview = host && host.includes("vercel.app") && host !== PRODUCTION_DOMAIN;

    if (isVercelPreview && !host.includes("localhost")) {
        return NextResponse.redirect(`https://${PRODUCTION_DOMAIN}${nextUrl.pathname}${nextUrl.search}`);
    }

    const isAuthPage = nextUrl.pathname === "/login";
    const isDashboardPage = nextUrl.pathname.startsWith("/dashboard");

    if (isAuthPage) {
        if (isLoggedIn) {
            return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
        return NextResponse.next();
    }

    if (isDashboardPage && !isLoggedIn) {
        let callbackUrl = nextUrl.pathname;
        if (nextUrl.search) {
            callbackUrl += nextUrl.search;
        }

        const encodedCallbackUrl = encodeURIComponent(callbackUrl);
        return NextResponse.redirect(
            new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl)
        );
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

export const proxy = proxyHandler;
export default proxyHandler;
