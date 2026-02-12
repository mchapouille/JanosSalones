import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DashboardShell from "@/components/DashboardShell";

export const metadata: Metadata = {
    title: "Dashboard",
};

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session) {
        redirect("/login");
    }

    return <DashboardShell>{children}</DashboardShell>;
}
