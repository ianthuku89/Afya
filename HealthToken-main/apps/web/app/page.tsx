import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { redirect } from "next/navigation";
import LandingPage from "../components/LandingPage";

export default async function Home() {
    const session = await getServerSession(authOptions);

    if (session?.user) {
        const role = (session.user as any).role;
        if (role === 'PATIENT') {
            redirect('/mobile');
        } else {
            redirect('/admin/overview');
        }
    }

    // Not logged in -> Show visual landing page or redirect to Auth
    return <LandingPage />;
}
