"use client";

/**
 * Platform settings form (client).
 * Validates: Requirements 34.2, 34.3, 34.4, 34.5.
 */

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { updateSettings } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

const FormSchema = z.object({
    platformName: z
        .string()
        .min(1, "Platform name is required")
        .max(100, "Cannot exceed 100 characters"),
    platformDescription: z
        .string()
        .min(1, "Description is required")
        .max(500, "Cannot exceed 500 characters"),
    featureUserSubmittedEnabled: z.boolean(),
    featurePaymentEnabled: z.boolean(),
});
type FormValues = z.infer<typeof FormSchema>;

interface Props {
    defaultValues: FormValues;
}

export function SettingsForm({ defaultValues }: Props) {
    const form = useForm<FormValues>({
        resolver: zodResolver(FormSchema),
        defaultValues,
        mode: "onBlur",
    });

    const submitting = form.formState.isSubmitting;
    const rootError = form.formState.errors.root?.message;

    const onSubmit = async (values: FormValues) => {
        try {
            const result = await updateSettings(values);
            if (result.ok) {
                toast.success("Settings saved.");
            } else {
                const { code, message, fieldErrors } = result.error;
                if (code === "VALIDATION" && fieldErrors) {
                    for (const [field, errors] of Object.entries(fieldErrors)) {
                        if (errors && errors.length > 0) {
                            form.setError(field as keyof FormValues, { message: errors[0] });
                        }
                    }
                    return;
                }
                const fallback = message || "Failed to save settings.";
                toast.error(fallback);
                form.setError("root", { message: fallback });
            }
        } catch {
            toast.error("Failed to save settings.");
            form.setError("root", { message: "Failed to save settings." });
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
            {/* Platform name */}
            <div className="space-y-2">
                <Label htmlFor="platformName">Platform name</Label>
                <Input
                    id="platformName"
                    type="text"
                    maxLength={100}
                    disabled={submitting}
                    {...form.register("platformName")}
                />
                {form.formState.errors.platformName && (
                    <p className="text-sm text-destructive">
                        {form.formState.errors.platformName.message}
                    </p>
                )}
            </div>

            {/* Platform description */}
            <div className="space-y-2">
                <Label htmlFor="platformDescription">Platform description</Label>
                <Textarea
                    id="platformDescription"
                    rows={3}
                    maxLength={500}
                    disabled={submitting}
                    {...form.register("platformDescription")}
                />
                {form.formState.errors.platformDescription && (
                    <p className="text-sm text-destructive">
                        {form.formState.errors.platformDescription.message}
                    </p>
                )}
            </div>

            <Separator />

            {/* Feature flags */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold">Feature flags</h3>

                <label className="flex cursor-pointer items-start gap-3">
                    <input
                        type="checkbox"
                        className="mt-0.5 size-4 rounded border-input"
                        disabled={submitting}
                        {...form.register("featureUserSubmittedEnabled")}
                    />
                    <div>
                        <p className="text-sm font-medium">User-submitted scholarships</p>
                        <p className="text-xs text-muted-foreground">
                            Allow authenticated users to submit scholarships for admin review.
                        </p>
                    </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3">
                    <input
                        type="checkbox"
                        className="mt-0.5 size-4 rounded border-input"
                        disabled={submitting}
                        {...form.register("featurePaymentEnabled")}
                    />
                    <div>
                        <p className="text-sm font-medium">Payment processing</p>
                        <p className="text-xs text-muted-foreground">
                            Enable the payment flow for scholarships with application fees.
                        </p>
                    </div>
                </label>
            </div>

            {rootError && (
                <p role="alert" className="text-sm text-destructive">{rootError}</p>
            )}

            <div className="flex justify-end">
                <Button type="submit" disabled={submitting} className="min-w-[8rem]">
                    {submitting ? (
                        <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Saving…
                        </>
                    ) : (
                        "Save settings"
                    )}
                </Button>
            </div>
        </form>
    );
}
