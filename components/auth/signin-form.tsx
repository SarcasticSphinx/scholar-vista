"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SigninForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data, error: authError } = await authClient.signIn.email({
                email,
                password,
            });

            if (authError) {
                toast.error(authError.message || "Invalid email or password");
                setIsLoading(false);
                return;
            }

            if (!data?.user) {
                toast.error("Authentication failed");
                setIsLoading(false);
                return;
            }

            // Check if user must change password
            const user = data.user as { role?: string; mustChangePassword?: boolean };

            if (user.mustChangePassword) {
                // Redirect to change password page
                window.location.href = "/change-password";
                return;
            }

            // Redirect based on user role
            const roleRedirects: Record<string, string> = {
                ADMIN: "/admin",
                OPERATOR: "/operator",
                CLIENT: "/",
            };

            window.location.href = (user.role && roleRedirects[user.role]) || "/";
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Something went wrong";
            toast.error(errorMessage);
            setIsLoading(false);
        }
    };

    return (
        <>
            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur">
                <form onSubmit={handleSubmit}>
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="email"
                                className="text-sm font-medium text-foreground"
                            >
                                Email
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                required
                                className="h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="password"
                                className="text-sm font-medium text-foreground"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    required
                                    className="h-11 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="flex-col gap-4 pt-2">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-11 bg-primary hover:bg-primary/90"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </>
    );
}
