"use client";

/**
 * Change-password form (client).
 *
 * React Hook Form + Zod (`ChangePasswordSchema`) on top of the Better
 * Auth client SDK. Calls `authClient.changePassword` with the current
 * and new password. On success the user sees a confirmation toast and
 * the form resets; remaining navigation is the user's choice (no forced
 * redirect — Req 3.10 only mandates the change flow itself).
 *
 * Failures are surfaced as a generic message. The schema also enforces
 * that the new password differs from the current one (Req 3.10).
 *
 * Validates: Requirements 3.10
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
    ChangePasswordSchema,
    type ChangePasswordInput,
} from "@/lib/validation/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GENERIC_ERROR = "Could not change password. Please try again.";

export function ChangePasswordForm() {
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);

    const form = useForm<ChangePasswordInput>({
        resolver: zodResolver(ChangePasswordSchema),
        defaultValues: { currentPassword: "", newPassword: "" },
    });

    const onSubmit = async (values: ChangePasswordInput) => {
        try {
            const { error } = await authClient.changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            });

            if (error) {
                // Better Auth returns a specific message for an incorrect
                // current password; bind that one to the field so users
                // know what to retype, but keep all other failures generic.
                const message = error.message ?? GENERIC_ERROR;
                if (/current password|incorrect/i.test(message)) {
                    form.setError("currentPassword", {
                        message: "Current password is incorrect",
                    });
                } else {
                    toast.error(GENERIC_ERROR);
                    form.setError("root", { message: GENERIC_ERROR });
                }
                return;
            }

            toast.success("Password changed successfully");
            form.reset({ currentPassword: "", newPassword: "" });
        } catch {
            toast.error(GENERIC_ERROR);
            form.setError("root", { message: GENERIC_ERROR });
        }
    };

    const submitting = form.formState.isSubmitting;
    const rootError = form.formState.errors.root?.message;

    return (
        <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
        >
            <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <div className="relative">
                    <Input
                        id="currentPassword"
                        type={showCurrent ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter your current password"
                        disabled={submitting}
                        aria-invalid={!!form.formState.errors.currentPassword}
                        className="h-11 pr-10"
                        {...form.register("currentPassword")}
                    />
                    <button
                        type="button"
                        onClick={() => setShowCurrent((v) => !v)}
                        aria-label={
                            showCurrent ? "Hide password" : "Show password"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {showCurrent ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                </div>
                {form.formState.errors.currentPassword && (
                    <p className="text-sm text-destructive">
                        {form.formState.errors.currentPassword.message}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <div className="relative">
                    <Input
                        id="newPassword"
                        type={showNew ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        disabled={submitting}
                        aria-invalid={!!form.formState.errors.newPassword}
                        className="h-11 pr-10"
                        {...form.register("newPassword")}
                    />
                    <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        aria-label={
                            showNew ? "Hide password" : "Show password"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {showNew ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                </div>
                {form.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">
                        {form.formState.errors.newPassword.message}
                    </p>
                )}
                <p className="text-xs text-muted-foreground">
                    Must be between 8 and 128 characters and different from your
                    current password.
                </p>
            </div>

            {rootError && (
                <p role="alert" className="text-sm text-destructive">
                    {rootError}
                </p>
            )}

            <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11"
            >
                {submitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing password...
                    </>
                ) : (
                    <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Change password
                    </>
                )}
            </Button>
        </form>
    );
}
