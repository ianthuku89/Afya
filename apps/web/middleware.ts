import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextRequest } from "next/server";

export default withAuth(
    function middleware(authReq) {
        // `authReq` is typed as NextRequestWithAuth, whose base type isn't
        // resolving in this monorepo. Use it only for `nextauth`, and treat
        // it as a plain NextRequest for everything else.
        const token = authReq.nextauth.token;
        const req = authReq as unknown as NextRequest;
        const path = req.nextUrl.pathname;

        // Must be logged in (the `authorized` callback below already blocks
        // unauthenticated users; this is a safety net)
        if (!token) {
            return NextResponse.redirect(new URL("/auth/signin", req.url));
        }

        const role = token.role as string;

        // 1. Mobile App Route Protection
        // Only PATIENTs use /mobile. Anyone else (e.g. an Admin) is sent to /admin/overview.
        if (path.startsWith("/mobile") && role !== "PATIENT") {
            return NextResponse.redirect(new URL("/admin/overview", req.url));
        }

        // 2. Admin Route Protection
        if (path.startsWith("/admin")) {
            // Patients don't belong in /admin
            if (role === "PATIENT") {
                return NextResponse.redirect(new URL("/mobile", req.url));
            }

            // Restrict specific admin tabs based on role
            if (role === "FACILITY") {
                const allowed = ["/admin/overview", "/admin/claims"];
                if (!allowed.some((p) => path.startsWith(p))) {
                    return NextResponse.redirect(new URL("/admin/overview", req.url));
                }
            }

            if (role === "SHA_ADMIN") {
                const allowed = ["/admin/overview", "/admin/claims", "/admin/facilities"];
                if (!allowed.some((p) => path.startsWith(p))) {
                    return NextResponse.redirect(new URL("/admin/overview", req.url));
                }
            }
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
        pages: {
            signIn: "/auth/signin",
        },
    }
);

// Apply middleware to these paths
export const config = {
    matcher: ["/admin/:path*", "/mobile/:path*"],
};