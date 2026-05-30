import { SigninForm } from "@/components/auth/signin-form";
import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";

export const metadata = {
    title: "Sign In - HomeX CRM",
    description: "Sign in to your HomeX CRM account",
};

export default async function SigninPage() {
    // Check if user is already logged in
    const session = await getServerSession();

    // If logged in, redirect based on role
    if (session?.user) {
        const role = session.user.role;
        if (role === "ADMIN") {
            redirect("/admin");
        } else if (role === "OPERATOR") {
            redirect("/operator");
        } else {
            redirect("/");
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-serif font-bold text-foreground">
                        HomeX<span className="text-primary">CRM</span>
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Sign in to your account
                    </p>
                </div>

                {/* Sign In Form */}
                <SigninForm />
            </div>
        </div>
    );
}
