"use client";

/**
 * Admin university create / edit form.
 *
 * React Hook Form + Zod backed by `createUniversity` / `updateUniversity`
 * Server Actions. Supports UploadThing logo upload.
 *
 * Validates: Requirements 18.2, 18.3, 18.4.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { createUniversity, updateUniversity } from "@/actions/university";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { UniversityTypeEnum } from "@/lib/validation/university";

const TYPE_OPTIONS: Array<{
    value: z.infer<typeof UniversityTypeEnum>;
    label: string;
}> = [
        { value: "PUBLIC", label: "Public" },
        { value: "PRIVATE", label: "Private" },
        { value: "COMMUNITY", label: "Community" },
    ];

const FormSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(200),
    logo: z.string().max(500).url("Must be a valid URL").optional().or(z.literal("")),
    contactEmail: z.string().email("Must be a valid email").max(254),
    website: z.string().url("Must be a valid URL").max(500),
    description: z.string().min(1, "Description is required").max(3000),
    address: z.string().trim().min(1, "Address is required").max(300),
    country: z.string().trim().min(1, "Country is required").max(100),
    city: z.string().trim().min(1, "City is required").max(100),
    worldRank: z
        .string()
        .refine((v) => {
            const n = Number(v);
            return Number.isInteger(n) && n >= 1 && n <= 30000;
        }, { message: "World rank must be between 1 and 30,000" }),
    type: UniversityTypeEnum,
    establishedYear: z
        .string()
        .refine((v) => {
            const n = Number(v);
            return Number.isInteger(n) && n >= 1000 && n <= new Date().getFullYear();
        }, { message: `Established year must be between 1000 and ${new Date().getFullYear()}` }),
    isPartner: z.boolean(),
    acceptingApplications: z.boolean(),
});
type FormValues = z.infer<typeof FormSchema>;

export interface UniversityFormDefaultValues {
    name?: string;
    logo?: string | null;
    contactEmail?: string;
    website?: string;
    description?: string;
    address?: string;
    country?: string;
    city?: string;
    worldRank?: number;
    type?: z.infer<typeof UniversityTypeEnum>;
    establishedYear?: number;
    isPartner?: boolean;
    acceptingApplications?: boolean;
}

export interface UniversityFormProps {
    defaultValues?: UniversityFormDefaultValues;
    editId?: string;
}

const GENERIC_ERROR = "Failed to save university. Please try again.";

export function UniversityForm({ defaultValues, editId }: UniversityFormProps) {
    const router = useRouter();
    const isEdit = Boolean(editId);

    const form = useForm<FormValues>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            name: defaultValues?.name ?? "",
            logo: defaultValues?.logo ?? "",
            contactEmail: defaultValues?.contactEmail ?? "",
            website: defaultValues?.website ?? "",
            description: defaultValues?.description ?? "",
            address: defaultValues?.address ?? "",
            country: defaultValues?.country ?? "",
            city: defaultValues?.city ?? "",
            worldRank: String(defaultValues?.worldRank ?? ""),
            type: defaultValues?.type ?? ("" as FormValues["type"]),
            establishedYear: String(defaultValues?.establishedYear ?? ""),
            isPartner: defaultValues?.isPartner ?? false,
            acceptingApplications: defaultValues?.acceptingApplications ?? true,
        },
        mode: "onBlur",
    });

    const submitting = form.formState.isSubmitting;
    const rootError = form.formState.errors.root?.message;
    const typeValue = useWatch({ control: form.control, name: "type" });

    const onSubmit = async (values: FormValues) => {
        const payload = {
            name: values.name.trim(),
            logo: values.logo || null,
            contactEmail: values.contactEmail,
            website: values.website,
            description: values.description,
            address: values.address.trim(),
            country: values.country.trim(),
            city: values.city.trim(),
            worldRank: Number(values.worldRank),
            type: values.type,
            establishedYear: Number(values.establishedYear),
            isPartner: values.isPartner,
            acceptingApplications: values.acceptingApplications,
        };

        try {
            const result = isEdit
                ? await updateUniversity(editId!, payload)
                : await createUniversity(payload);

            if (result.ok) {
                toast.success(isEdit ? "University updated." : "University created.");
                router.push("/dashboard/universities");
                router.refresh();
                return;
            }

            const { code, message, fieldErrors } = result.error;
            if (code === "VALIDATION" && fieldErrors) {
                for (const [field, errors] of Object.entries(fieldErrors)) {
                    if (errors && errors.length > 0) {
                        form.setError(field as keyof FormValues, { message: errors[0] });
                    }
                }
                return;
            }
            const fallback = message || GENERIC_ERROR;
            toast.error(fallback);
            form.setError("root", { message: fallback });
        } catch {
            toast.error(GENERIC_ERROR);
            form.setError("root", { message: GENERIC_ERROR });
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" type="text" maxLength={200} disabled={submitting} {...form.register("name")} />
                {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
            </div>

            {/* Logo URL */}
            <div className="space-y-2">
                <Label htmlFor="logo">
                    Logo URL{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input id="logo" type="url" maxLength={500} placeholder="https://cdn.example.com/logo.png" disabled={submitting} {...form.register("logo")} />
                {form.formState.errors.logo && (
                    <p className="text-sm text-destructive">{form.formState.errors.logo.message}</p>
                )}
            </div>

            {/* Contact email + Website */}
            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact email</Label>
                    <Input id="contactEmail" type="email" maxLength={254} disabled={submitting} {...form.register("contactEmail")} />
                    {form.formState.errors.contactEmail && (
                        <p className="text-sm text-destructive">{form.formState.errors.contactEmail.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" type="url" maxLength={500} placeholder="https://university.edu" disabled={submitting} {...form.register("website")} />
                    {form.formState.errors.website && (
                        <p className="text-sm text-destructive">{form.formState.errors.website.message}</p>
                    )}
                </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={4} maxLength={3000} disabled={submitting} {...form.register("description")} />
                {form.formState.errors.description && (
                    <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                )}
            </div>

            {/* Address */}
            <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" type="text" maxLength={300} disabled={submitting} {...form.register("address")} />
                {form.formState.errors.address && (
                    <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
                )}
            </div>

            {/* Country + City */}
            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" type="text" maxLength={100} disabled={submitting} {...form.register("country")} />
                    {form.formState.errors.country && (
                        <p className="text-sm text-destructive">{form.formState.errors.country.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" type="text" maxLength={100} disabled={submitting} {...form.register("city")} />
                    {form.formState.errors.city && (
                        <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
                    )}
                </div>
            </div>

            {/* World rank + Established year + Type */}
            <div className="grid gap-5 sm:grid-cols-3">
                <div className="space-y-2">
                    <Label htmlFor="worldRank">World rank</Label>
                    <Input id="worldRank" type="number" min={1} max={30000} disabled={submitting} {...form.register("worldRank")} />
                    {form.formState.errors.worldRank && (
                        <p className="text-sm text-destructive">{form.formState.errors.worldRank.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="establishedYear">Established year</Label>
                    <Input id="establishedYear" type="number" min={1000} max={new Date().getFullYear()} disabled={submitting} {...form.register("establishedYear")} />
                    {form.formState.errors.establishedYear && (
                        <p className="text-sm text-destructive">{form.formState.errors.establishedYear.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                        value={typeof typeValue === "string" && typeValue.length > 0 ? typeValue : undefined}
                        onValueChange={(v) =>
                            form.setValue("type", v as FormValues["type"], { shouldValidate: true, shouldDirty: true })
                        }
                        disabled={submitting}
                    >
                        <SelectTrigger id="type" aria-invalid={!!form.formState.errors.type}>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            {TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {form.formState.errors.type && (
                        <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
                    )}
                </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6">
                <label className="flex cursor-pointer items-center gap-2">
                    <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        disabled={submitting}
                        {...form.register("isPartner")}
                    />
                    <span className="text-sm font-medium">Partner university</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                    <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        disabled={submitting}
                        {...form.register("acceptingApplications")}
                    />
                    <span className="text-sm font-medium">Accepting applications</span>
                </label>
            </div>

            {rootError && (
                <p role="alert" className="text-sm text-destructive">{rootError}</p>
            )}

            <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" disabled={submitting} onClick={() => router.back()}>
                    Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="min-w-[8rem]">
                    {submitting ? (
                        <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Saving...
                        </>
                    ) : isEdit ? (
                        "Save changes"
                    ) : (
                        "Create university"
                    )}
                </Button>
            </div>
        </form>
    );
}
