"use client";

/**
 * Admin scholarship create / edit form.
 *
 * React Hook Form + Zod backed by `createScholarship` / `updateScholarship`
 * Server Actions. Used by both the new-scholarship page and the edit page;
 * the `defaultValues` prop distinguishes the two modes.
 *
 * Validates: Requirements 17.2, 17.3, 17.4.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { createScholarship, updateScholarship } from "@/actions/scholarship";
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
import { ScholarshipCategoryEnum } from "@/lib/validation/scholarship";

const CATEGORY_OPTIONS: Array<{
    value: z.infer<typeof ScholarshipCategoryEnum>;
    label: string;
}> = [
        { value: "UNDERGRADUATE", label: "Undergraduate" },
        { value: "MASTERS", label: "Masters" },
        { value: "PHD", label: "PhD" },
        { value: "POSTDOC", label: "Postdoc" },
        { value: "EXCHANGE", label: "Exchange" },
        { value: "SHORT_COURSE", label: "Short Course" },
    ];

const FormSchema = z.object({
    title: z.string().trim().min(1, "Title is required").max(200),
    universityId: z.string().min(1, "University is required"),
    category: ScholarshipCategoryEnum,
    subject: z.string().trim().min(1, "Subject is required").max(100),
    description: z.string().min(1, "Description is required").max(5000),
    stipend: z
        .string()
        .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, {
            message: "Stipend must be a non-negative number",
        }),
    coverage: z.string().trim().min(1, "Coverage is required").max(500),
    location: z.string().trim().min(1, "Location is required").max(200),
    requirements: z.string().min(1, "Requirements are required").max(3000),
    deadline: z.string().min(1, "Deadline is required"),
    applicationLink: z
        .string()
        .trim()
        .min(1, "Application link is required")
        .max(500)
        .url("Must be a valid URL"),
    fees: z
        .string()
        .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, {
            message: "Fees must be a non-negative number",
        }),
    image: z
        .string()
        .max(500)
        .url("Must be a valid URL")
        .optional()
        .or(z.literal("")),
    isApproved: z.boolean().optional(),
});
type FormValues = z.infer<typeof FormSchema>;

export interface UniversityOption {
    id: string;
    name: string;
}

export interface ScholarshipFormDefaultValues {
    id?: string;
    title?: string;
    universityId?: string;
    category?: z.infer<typeof ScholarshipCategoryEnum>;
    subject?: string;
    description?: string;
    stipend?: string;
    coverage?: string;
    location?: string;
    requirements?: string;
    deadline?: string;
    applicationLink?: string;
    fees?: string;
    image?: string | null;
    isApproved?: boolean;
}

export interface ScholarshipFormProps {
    universities: readonly UniversityOption[];
    defaultValues?: ScholarshipFormDefaultValues;
    /** When provided, the form calls `updateScholarship(editId, ...)`. */
    editId?: string;
}

const GENERIC_ERROR = "Failed to save scholarship. Please try again.";

export function ScholarshipForm({
    universities,
    defaultValues,
    editId,
}: ScholarshipFormProps) {
    const router = useRouter();
    const isEdit = Boolean(editId);

    const form = useForm<FormValues>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            title: defaultValues?.title ?? "",
            universityId: defaultValues?.universityId ?? "",
            category: defaultValues?.category ?? ("" as FormValues["category"]),
            subject: defaultValues?.subject ?? "",
            description: defaultValues?.description ?? "",
            stipend: defaultValues?.stipend ?? "0",
            coverage: defaultValues?.coverage ?? "",
            location: defaultValues?.location ?? "",
            requirements: defaultValues?.requirements ?? "",
            deadline: defaultValues?.deadline ?? "",
            applicationLink: defaultValues?.applicationLink ?? "",
            fees: defaultValues?.fees ?? "0",
            image: defaultValues?.image ?? "",
            isApproved: defaultValues?.isApproved ?? true,
        },
        mode: "onBlur",
    });

    const submitting = form.formState.isSubmitting;
    const rootError = form.formState.errors.root?.message;
    const universityIdValue = useWatch({ control: form.control, name: "universityId" });
    const categoryValue = useWatch({ control: form.control, name: "category" });

    const onSubmit = async (values: FormValues) => {
        const payload = {
            title: values.title.trim(),
            universityId: values.universityId,
            category: values.category,
            subject: values.subject.trim(),
            description: values.description,
            stipend: Number(values.stipend),
            coverage: values.coverage.trim(),
            location: values.location.trim(),
            requirements: values.requirements,
            deadline: new Date(values.deadline),
            applicationLink: values.applicationLink.trim(),
            fees: Number(values.fees),
            image: values.image || null,
            isApproved: values.isApproved,
        };

        try {
            const result = isEdit
                ? await updateScholarship(editId!, payload)
                : await createScholarship(payload);

            if (result.ok) {
                toast.success(
                    isEdit ? "Scholarship updated." : "Scholarship created.",
                );
                router.push("/dashboard/scholarships");
                router.refresh();
                return;
            }

            const { code, message, fieldErrors } = result.error;
            if (code === "VALIDATION" && fieldErrors) {
                for (const [field, errors] of Object.entries(fieldErrors)) {
                    if (errors && errors.length > 0) {
                        form.setError(field as keyof FormValues, {
                            message: errors[0],
                        });
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
            {/* Title */}
            <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                    id="title"
                    type="text"
                    maxLength={200}
                    disabled={submitting}
                    aria-invalid={!!form.formState.errors.title}
                    {...form.register("title")}
                />
                {form.formState.errors.title && (
                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
            </div>

            {/* University + Category */}
            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="universityId">University</Label>
                    <Select
                        value={universityIdValue || undefined}
                        onValueChange={(v) =>
                            form.setValue("universityId", v, { shouldValidate: true, shouldDirty: true })
                        }
                        disabled={submitting}
                    >
                        <SelectTrigger id="universityId" aria-invalid={!!form.formState.errors.universityId}>
                            <SelectValue placeholder="Select a university" />
                        </SelectTrigger>
                        <SelectContent>
                            {universities.map((u) => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {form.formState.errors.universityId && (
                        <p className="text-sm text-destructive">{form.formState.errors.universityId.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                        value={typeof categoryValue === "string" && categoryValue.length > 0 ? categoryValue : undefined}
                        onValueChange={(v) =>
                            form.setValue("category", v as FormValues["category"], { shouldValidate: true, shouldDirty: true })
                        }
                        disabled={submitting}
                    >
                        <SelectTrigger id="category" aria-invalid={!!form.formState.errors.category}>
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            {CATEGORY_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {form.formState.errors.category && (
                        <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
                    )}
                </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" type="text" maxLength={100} disabled={submitting} {...form.register("subject")} />
                {form.formState.errors.subject && (
                    <p className="text-sm text-destructive">{form.formState.errors.subject.message}</p>
                )}
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={5} maxLength={5000} disabled={submitting} {...form.register("description")} />
                {form.formState.errors.description && (
                    <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                )}
            </div>

            {/* Stipend + Fees */}
            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="stipend">Stipend (USD)</Label>
                    <Input id="stipend" type="number" min={0} step="0.01" disabled={submitting} {...form.register("stipend")} />
                    {form.formState.errors.stipend && (
                        <p className="text-sm text-destructive">{form.formState.errors.stipend.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="fees">Application fees (USD)</Label>
                    <Input id="fees" type="number" min={0} step="0.01" disabled={submitting} {...form.register("fees")} />
                    {form.formState.errors.fees && (
                        <p className="text-sm text-destructive">{form.formState.errors.fees.message}</p>
                    )}
                </div>
            </div>

            {/* Coverage */}
            <div className="space-y-2">
                <Label htmlFor="coverage">Coverage</Label>
                <Input id="coverage" type="text" maxLength={500} placeholder="e.g. Full tuition + living allowance" disabled={submitting} {...form.register("coverage")} />
                {form.formState.errors.coverage && (
                    <p className="text-sm text-destructive">{form.formState.errors.coverage.message}</p>
                )}
            </div>

            {/* Location + Deadline */}
            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" type="text" maxLength={200} disabled={submitting} {...form.register("location")} />
                    {form.formState.errors.location && (
                        <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input id="deadline" type="date" disabled={submitting} {...form.register("deadline")} />
                    {form.formState.errors.deadline && (
                        <p className="text-sm text-destructive">{form.formState.errors.deadline.message}</p>
                    )}
                </div>
            </div>

            {/* Requirements */}
            <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea id="requirements" rows={4} maxLength={3000} disabled={submitting} {...form.register("requirements")} />
                {form.formState.errors.requirements && (
                    <p className="text-sm text-destructive">{form.formState.errors.requirements.message}</p>
                )}
            </div>

            {/* Application link */}
            <div className="space-y-2">
                <Label htmlFor="applicationLink">Application link</Label>
                <Input id="applicationLink" type="url" maxLength={500} placeholder="https://example.org/apply" disabled={submitting} {...form.register("applicationLink")} />
                {form.formState.errors.applicationLink && (
                    <p className="text-sm text-destructive">{form.formState.errors.applicationLink.message}</p>
                )}
            </div>

            {/* Image URL (optional) */}
            <div className="space-y-2">
                <Label htmlFor="image">
                    Image URL{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input id="image" type="url" maxLength={500} placeholder="https://cdn.example.com/image.jpg" disabled={submitting} {...form.register("image")} />
                {form.formState.errors.image && (
                    <p className="text-sm text-destructive">{form.formState.errors.image.message}</p>
                )}
            </div>

            {rootError && (
                <p role="alert" className="text-sm text-destructive">{rootError}</p>
            )}

            <div className="flex justify-end gap-3">
                <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => router.back()}
                >
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
                        "Create scholarship"
                    )}
                </Button>
            </div>
        </form>
    );
}
