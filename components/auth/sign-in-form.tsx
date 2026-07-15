"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { SignInSchema, type SignInInput } from "@/lib/validation/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";

const GENERIC_ERROR = "Invalid email or password";

/** Resolve a safe in-app destination from a `?returnUrl=` search param. */
function safeReturnUrl(raw: string | null): string {
    if (!raw) return "/";
    // Reject anything that isn't an in-app path to avoid open redirects.
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
    return raw;
}

export function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = safeReturnUrl(searchParams.get("returnUrl"));

    const [showPassword, setShowPassword] = useState(false);
    const [oauthPending, setOauthPending] = useState(false);

    const form = useForm<SignInInput>({
        resolver: zodResolver(SignInSchema),
        defaultValues: { email: "", password: "" },
    });

    const onSubmit = async (values: SignInInput) => {
        try {
            const { data, error } = await authClient.signIn.email({
                email: values.email,
                password: values.password,
            });

            if (error || !data?.user) {
                toast.error(GENERIC_ERROR);
                form.setError("root", { message: GENERIC_ERROR });
                return;
            }

            router.replace(returnUrl);
            router.refresh();
        } catch {
            toast.error(GENERIC_ERROR);
            form.setError("root", { message: GENERIC_ERROR });
        }
    };

    const onGoogle = async () => {
        setOauthPending(true);
        try {
            await authClient.signIn.social({
                provider: "google",
                callbackURL: returnUrl,
            });
        } catch {
            setOauthPending(false);
            toast.error("Could not start Google sign-in");
        }
    };

    const submitting = form.formState.isSubmitting;
    const rootError = form.formState.errors.root?.message;

    return (
        <Card className="border-0 shadow-xl bg-card/80 backdrop-blur">
            <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl">Welcome back</CardTitle>
                <CardDescription>Sign in to your ScholarVista account</CardDescription>
            </CardHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <CardContent className="space-y-4">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11"
                        onClick={onGoogle}
                        disabled={oauthPending || submitting}
                    >
                        {oauthPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <GoogleIcon className="mr-2 h-4 w-4" />
                        )}
                        Continue with Google
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            disabled={submitting}
                            aria-invalid={!!form.formState.errors.email}
                            className="h-11"
                            {...form.register("email")}
                        />
                        {form.formState.errors.email && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.email.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                disabled={submitting}
                                aria-invalid={!!form.formState.errors.password}
                                className="h-11 pr-10"
                                {...form.register("password")}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={
                                    showPassword ? "Hide password" : "Show password"
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {form.formState.errors.password && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.password.message}
                            </p>
                        )}
                    </div>

                    {rootError && (
                        <p
                            role="alert"
                            className="text-sm text-destructive"
                        >
                            {rootError}
                        </p>
                    )}
                </CardContent>

                <CardFooter className="flex-col gap-4 pt-2">
                    <Button
                        type="submit"
                        disabled={submitting || oauthPending}
                        className="w-full h-11"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            "Sign in"
                        )}
                    </Button>

                    <p className="text-sm text-muted-foreground">
                        Don&apos;t have an account?{" "}
                        <Link
                            href={
                                returnUrl === "/"
                                    ? "/sign-up"
                                    : `/sign-up?returnUrl=${encodeURIComponent(returnUrl)}`
                            }
                            className="font-medium text-brand hover:underline"
                        >
                            Sign up
                        </Link>
                    </p>
                </CardFooter>
            </form>
        </Card>
    );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
            <path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
            />
            <path
                fill="#FF3D00"
                d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
            />
            <path
                fill="#4CAF50"
                d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
            />
            <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
            />
        </svg>
    );
}
