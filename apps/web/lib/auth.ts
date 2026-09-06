import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                phone: { label: "Phone Number", type: "text", placeholder: "+254700000000" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.phone || !credentials?.password) return null;

                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
                    const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
                        method: 'POST',
                        body: JSON.stringify({ phone: credentials.phone, password: credentials.password }),
                        headers: { "Content-Type": "application/json" }
                    });

                    const data = await res.json();

                    if (res.ok && data.user && data.accessToken) {
                        return {
                            id: data.user.id,
                            name: data.user.name || data.user.phone,
                            role: data.user.role,
                            accessToken: data.accessToken,
                            refreshToken: data.refreshToken
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
    secret: process.env.NEXTAUTH_SECRET || "afyaToken-dev-secret-do-not-use-in-prod-123",
};
