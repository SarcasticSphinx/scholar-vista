import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getOptionalSession } from "@/lib/rbac";
import { SignInForm } from "@/components/auth/sign-in-form";


export const metadata: Metadata = {
    title: "Sign in — ScholarVista",
    description: "Sign in to your ScholarVista account.",
};

export default async function SignInPage() {
    const session = await getOptionalSession();
    if (session?.user) {
        redirect("/");
    }

    return (
        <div className="w-full max-w-md px-4">
            <div className="mb-8 flex flex-col items-center text-center">
                <Link href="/" aria-label="ScholarVista — home">
                    <Image
                        src="/scholar-vista-logo.png"
                        alt="ScholarVista"
                        width={1966}
                        height={694}
                        priority
                        className="h-10 w-auto"
                    />
                </Link>
                <p className="mt-4 text-muted-foreground">
                    Sign in to your account
                </p>
            </div>

            <SignInForm />
        </div>
    );
}
