"use client";

import { useActionState, useEffect } from "react";
import { changePasswordAndRedirect } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ChangePasswordFormProps {
    redirectTo: string;
}

export function ChangePasswordForm({ redirectTo }: ChangePasswordFormProps) {
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const changePasswordWithRedirect = changePasswordAndRedirect.bind(null, redirectTo);
    const [state, action, pending] = useActionState(changePasswordWithRedirect, { success: false });

    useEffect(() => {
        if (state.errors?._form) {
            toast.error(state.errors._form[0]);
        } else if (state.success && state.message) {
            toast.success(state.message);
        }
    }, [state]);

    return (
        <form action={action} className="space-y-4">
            <div className="space-y-2">
                <label htmlFor="currentPassword" className="text-sm font-medium text-foreground">
                    Current Password
                </label>
                <div className="relative">
                    <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Enter your current password"
                        disabled={pending}
                        required
                        className="h-11 pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                {state.errors?.currentPassword && (
                    <p className="text-sm text-red-600">{state.errors.currentPassword[0]}</p>
                )}
            </div>

            <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium text-foreground">
                    New Password
                </label>
                <div className="relative">
                    <Input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter your new password"
                        disabled={pending}
                        required
                        className="h-11 pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                {state.errors?.newPassword && (
                    <p className="text-sm text-red-600">{state.errors.newPassword[0]}</p>
                )}
                <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters with uppercase, lowercase, and number
                </p>
            </div>

            <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                    Confirm New Password
                </label>
                <div className="relative">
                    <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your new password"
                        disabled={pending}
                        required
                        className="h-11 pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                {state.errors?.confirmPassword && (
                    <p className="text-sm text-red-600">{state.errors.confirmPassword[0]}</p>
                )}
            </div>

            <Button
                type="submit"
                disabled={pending}
                className="w-full h-11 bg-primary hover:bg-primary/90 mt-6"
            >
                {pending ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing Password...
                    </>
                ) : (
                    <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Change Password
                    </>
                )}
            </Button>
        </form>
    );
}
