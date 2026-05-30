import { requireAdmin } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "../layout-client";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let user;
    try {
        user = await requireAdmin();
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") {
                redirect("/signin");
            }
            if (error.message.includes("Forbidden")) {
                redirect("/operator");
            }
        }
        redirect("/signin");
    }

    return (
        <DashboardLayoutClient
            user={{
                name: user.name || "Admin",
                role: user.role || "ADMIN",
                image: user.image,
            }}
        >
            {children}
        </DashboardLayoutClient>
    );
}
