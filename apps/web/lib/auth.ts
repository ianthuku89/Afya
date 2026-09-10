import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text", placeholder: "you@example.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
                    const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
                        method: 'POST',
                        body: JSON.stringify({ email: credentials.email, password: credentials.password }),
                        headers: { "Content-Type": "application/json" }
                    });

                    const result = await res.json();

                    // Backend responds with: { success: true, data: { accessToken, refreshToken, user } }
                    if (res.ok && result.success && result.data?.user && result.data?.accessToken) {
                        const { user, accessToken, refreshToken } = result.data;
                        return {
                            id: user.id,
                            name: user.fullName || user.email,
                            role: user.role,
                            accessToken,
                            refreshToken
                        } as any;
                    }
                    return null;
                } catch (e) {
                    console.error("Auth error:", e);
                    return null;
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.accessToken = (user as any).accessToken;
                token.refreshToken = (user as any).refreshToken;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
                (session as any).accessToken = token.accessToken;
            }
            return session;
        }
    },
    pages: {
        signIn: '/auth/signin',
    },
    session: { strategy: "jwt" },
    secret: process.env.NEXTAUTH_SECRET,
};