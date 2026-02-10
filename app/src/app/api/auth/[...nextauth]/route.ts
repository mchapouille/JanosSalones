import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const handler = NextAuth({
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const email = credentials?.email as string | undefined;
                const password = credentials?.password as string | undefined;

                if (
                    email === process.env.ADMIN_EMAIL &&
                    password === process.env.ADMIN_PASSWORD
                ) {
                    return {
                        id: "1",
                        name: "Admin Serendip.IA",
                        email: process.env.ADMIN_EMAIL,
                    };
                }
                return null;
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
});

export const { GET, POST } = handler.handlers;
