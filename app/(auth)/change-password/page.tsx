import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export const metadata = {
    title: "Change Password - HomeX CRM",
    description: "Change your password",
};

export default async function ChangePasswordPage() {
    const session = await getServerSession();

    if (!session?.user) {
        redirect("/signin");
    }

    // Only show this page if user must change password
    if (!session.user.mustChangePassword) {
        // Redirect based on role
        if (session.user.role === "ADMIN") {
            redirect("/admin");
        } else if (session.user.role === "OPERATOR") {
            redirect("/operator");
        } else {
            redirect("/");
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-md">
                <div className="bg-background rounded-xl shadow-lg p-8">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-foreground">
                            Change Your Password
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            For security reasons, you must change your password before continuing.
                        </p>
                    </div>
                    <ChangePasswordForm redirectTo={session.user.role === "ADMIN" ? "/admin" : "/operator"} />
                </div>
            </div>
        </div>
    );
}
