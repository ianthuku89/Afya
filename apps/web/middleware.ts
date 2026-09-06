import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;

        // Must be logged in
        if (!token) return NextResponse.redirect(new URL("/auth/signin", req.url));

        const role = token.role as string;

        // 1. Mobile App Route Protection
        // Patients can only access mobile
        if (path.startsWith("/mobile") && role !== "PATIENT") {
            // In a real app we might let admins see it, but strictly per spec: PATIENTs use mobile.
            // E.g. if an Admin hits /mobile, redirect to /admin/overview
            if (role !== "PATIENT") {
                return NextResponse.redirect(new URL("/admin/overview", req.url));
            }
        }

        // Admins/Facilities trying to access /admin
        if (path.startsWith("/admin")) {
            if (role === "PATIENT") {
                return NextResponse.redirect(new URL("/mobile", req.url));
            }

            // Restrict specific admin tabs based on role
            if (role === "FACILITY") {
                const allowed = ["/admin/overview", "/admin/claims"];
                if (!allowed.some(p => path.startsWith(p))) {
                    return NextResponse.redirect(new URL("/admin/overview", req.url));
                }
            }

            if (role === "SHA_ADMIN") {
                const allowed = ["/admin/overview", "/admin/claims", "/admin/facilities"];
                if (!allowed.some(p => path.startsWith(p))) {
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
    }
);

// Apply middleware to these paths
export const config = {
    matcher: ["/admin/:path*", "/mobile/:path*"],
};
