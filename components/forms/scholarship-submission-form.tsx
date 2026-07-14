"use client";

/**
 * User-submitted scholarship form (client).
 *
 * React Hook Form + Zod on top of the `createScholarshipSubmission`
 * Server Action. Authenticated users fill out title, university,
 * category, subject, description, optional stipend, deadline, and
 * application link; on submit the action persists a new Scholarship
 * row with `isApproved=false` and the current user as `postedById`
 * (Req 11.1, 11.2).
 *
 * Behaviour:
 *   - Client-side validation mirrors the server schema so users see
 *     specific error messages adjacent to each invalid field
 *     (Req 11.3, 11.4, 11.5).
 *   - On `FEATURE_DISABLED` the form swaps in a banner explaining that
 *     user-submitted scholarships are currently turned off (Req 34.4).
 *   - On success a "Submitted - pending approval" toast is shown and
 *     the user is redirected to `/my-applications` (Req 11.6).
 *   - Other failures preserve the entered values and show a generic
 *     toast / inline root error.
 *
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 34.4.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { createScholarshipSubmission } from "@/actions/scholarship";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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

/** Maximum description length per Req 11.1. */
const DESCRIPTION_MAX = 2000;

/** Categories rendered in the category select (mirrors `ScholarshipCategoryEnum`). */
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

/**
 * Form-side schema mirroring the server-side `ScholarshipSubmissionSchema`
 * but operating on raw string inputs (HTML `<input>` values are always
 * strings). The Server Action re-validates with the canonical schema —
 * which performs date / number coercion — so this client schema only
 * has to surface fast feedback adjacent to each field.
 *
 * Validates: Requirements 11.3, 11.4.
 */
const FormSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "Title is required")
        .max(200, "Title cannot exceed 200 characters"),
    universityId: z.string().min(1, "University is required"),
    category: ScholarshipCategoryEnum,
    subject: z
        .string()
        .trim()
        .min(1, "Subject is required")
        .max(100, "Subject cannot exceed 100 characters"),
    description: z
        .string()
        .min(1, "Description is required")
        .max(
            DESCRIPTION_MAX,
            `Description cannot exceed ${DESCRIPTION_MAX} characters`,
        ),
    stipend: z
        .string()
        .optional()
        .refine(
            (v) =>
                v === undefined ||
                v === "" ||
                (!Number.isNaN(Number(v)) && Number(v) >= 0),
            { message: "Stipend must be a non-negative number" },
        ),
    deadline: z
        .string()
        .min(1, "Deadline is required")
        .refine(
            (v) => {
                const t = new Date(v).getTime();
                return Number.isFinite(t) && t > Date.now();
            },
            { message: "Deadline must be a future date" },
        ),
    applicationLink: z
        .string()
        .trim()
        .min(1, "Application link is required")
        .max(500, "Application link cannot exceed 500 characters")
        .url("Application link must be a valid URL"),
});
type FormValues = z.infer<typeof FormSchema>;

/** Pre-cast a `FormValues` object into the server-action payload. */
function toSubmissionPayload(values: FormValues): unknown {
    return {
        title: values.title.trim(),
        universityId: values.universityId,
        category: values.category,
        subject: values.subject.trim(),
        description: values.description,
        // Empty string → undefined so the optional field passes server validation.
        stipend:
            values.stipend === undefined || values.stipend === ""
                ? undefined
                : values.stipend,
        deadline: values.deadline,
        applicationLink: values.applicationLink.trim(),
    };
}

export interface UniversityOption {
    id: string;
    name: string;
}

export interface ScholarshipSubmissionFormProps {
    /**
     * Universities populated from the server. The select shows these
     * names; submission stores the matching `id`.
     */
    universities: readonly UniversityOption[];
}

const GENERIC_ERROR =
    "Submission failed. Please review the form and try again.";

export function ScholarshipSubmissionForm({
    universities,
}: ScholarshipSubmissionFormProps) {
    const router = useRouter();

    /**
     * Tracks whether the server reported the feature flag as disabled.
     * When true we render an explanatory banner in place of the form so
     * users get immediate feedback without re-submitting.
     */
    const [featureDisabled, setFeatureDisabled] = React.useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            title: "",
            universityId: "",
            // RHF requires `category` to start in a defined state; we use
            // an empty string cast to the enum and validate on submit.
            category: "" as unknown as FormValues["category"],
            subject: "",
            description: "",
            stipend: "",
            deadline: "",
            applicationLink: "",
        },
        mode: "onBlur",
    });

    const description = useWatch({ control: form.control, name: "description" }) ?? "";
    const universityIdValue = useWatch({ control: form.control, name: "universityId" });
    const categoryValue = useWatch({ control: form.control, name: "category" });
    const submitting = form.formState.isSubmitting;
    const rootError = form.formState.errors.root?.message;

    const onSubmit = async (values: FormValues) => {
        try {
            const result = await createScholarshipSubmission(
                toSubmissionPayload(values),
            );

            if (result.ok) {
                toast.success("Submitted - pending approval");
                router.push("/my-applications");
                router.refresh();
                return;
            }

            const { code, message, fieldErrors } = result.error;

            if (code === "FEATURE_DISABLED") {
                setFeatureDisabled(true);
                toast.error(
                    "User-submitted scholarships are currently disabled.",
                );
                return;
            }

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

            if (code === "UNAUTHORIZED") {
                router.push(
                    `/sign-in?returnUrl=${encodeURIComponent("/scholarships/new")}`,
                );
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

    if (featureDisabled) {
        return <FeatureDisabledBanner />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Submit a scholarship</CardTitle>
                <CardDescription>
                    Share an opportunity with the community. Submissions are
                    reviewed by our team before being published.
                </CardDescription>
            </CardHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <CardContent className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            type="text"
                            autoComplete="off"
                            placeholder="e.g. Erasmus Mundus Joint Master Scholarship"
                            maxLength={200}
                            disabled={submitting}
                            aria-invalid={!!form.formState.errors.title}
                            {...form.register("title")}
                        />
                        {form.formState.errors.title && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.title.message}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="universityId">University</Label>
                            <Select
                                value={universityIdValue || undefined}
                                onValueChange={(value) =>
                                    form.setValue("universityId", value, {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                    })
                                }
                                disabled={
                                    submitting || universities.length === 0
                                }
                            >
                                <SelectTrigger
                                    id="universityId"
                                    className="w-full"
                                    aria-invalid={
                                        !!form.formState.errors.universityId
                                    }
                                >
                                    <SelectValue
                                        placeholder={
                                            universities.length === 0
                                                ? "No universities available"
                                                : "Select a university"
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {universities.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.universityId && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.universityId.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                                value={
                                    typeof categoryValue === "string" &&
                                        categoryValue.length > 0
                                        ? categoryValue
                                        : undefined
                                }
                                onValueChange={(value) =>
                                    form.setValue(
                                        "category",
                                        value as FormValues["category"],
                                        {
                                            shouldValidate: true,
                                            shouldDirty: true,
                                        },
                                    )
                                }
                                disabled={submitting}
                            >
                                <SelectTrigger
                                    id="category"
                                    className="w-full"
                                    aria-invalid={
                                        !!form.formState.errors.category
                                    }
                                >
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORY_OPTIONS.map((opt) => (
                                        <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.category && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.category.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                            id="subject"
                            type="text"
                            autoComplete="off"
                            placeholder="e.g. Computer Science"
                            maxLength={100}
                            disabled={submitting}
                            aria-invalid={!!form.formState.errors.subject}
                            {...form.register("subject")}
                        />
                        {form.formState.errors.subject && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.subject.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            rows={6}
                            maxLength={DESCRIPTION_MAX}
                            placeholder="Describe the scholarship, eligibility criteria, and any details applicants should know."
                            disabled={submitting}
                            aria-invalid={!!form.formState.errors.description}
                            aria-describedby="description-counter"
                            {...form.register("description")}
                        />
                        <div className="flex items-center justify-between">
                            {form.formState.errors.description ? (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.description.message}
                                </p>
                            ) : (
                                <span className="text-xs text-muted-foreground">
                                    Maximum {DESCRIPTION_MAX} characters.
                                </span>
                            )}
                            <span
                                id="description-counter"
                                className="text-xs text-muted-foreground"
                                aria-live="polite"
                            >
                                {description.length}/{DESCRIPTION_MAX}
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="stipend">
                                Stipend{" "}
                                <span className="font-normal text-muted-foreground">
                                    (optional)
                                </span>
                            </Label>
                            <Input
                                id="stipend"
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="0.01"
                                placeholder="0.00"
                                disabled={submitting}
                                aria-invalid={!!form.formState.errors.stipend}
                                {...form.register("stipend")}
                            />
                            {form.formState.errors.stipend && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.stipend.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="deadline">Deadline</Label>
                            <Input
                                id="deadline"
                                type="date"
                                disabled={submitting}
                                aria-invalid={!!form.formState.errors.deadline}
                                {...form.register("deadline")}
                            />
                            {form.formState.errors.deadline && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.deadline.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="applicationLink">Application link</Label>
                        <Input
                            id="applicationLink"
                            type="url"
                            inputMode="url"
                            placeholder="https://example.org/apply"
                            maxLength={500}
                            disabled={submitting}
                            aria-invalid={
                                !!form.formState.errors.applicationLink
                            }
                            {...form.register("applicationLink")}
                        />
                        {form.formState.errors.applicationLink && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.applicationLink.message}
                            </p>
                        )}
                    </div>

                    {rootError && (
                        <p role="alert" className="text-sm text-destructive">
                            {rootError}
                        </p>
                    )}
                </CardContent>

                <CardFooter className="flex justify-end pt-2">
                    <Button
                        type="submit"
                        disabled={submitting}
                        className="min-w-[10rem]"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            "Submit for review"
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

/**
 * Banner displayed when the server reports `FEATURE_DISABLED` after the
 * client form was already shown (e.g. settings flipped between page
 * load and submission). Mirrors the page-level disabled state so the
 * message is consistent regardless of when the flag was checked.
 */
function FeatureDisabledBanner() {
    return (
        <Card>
            <CardHeader className="flex-row items-start gap-3 space-y-0">
                <TriangleAlert
                    aria-hidden="true"
                    className="mt-0.5 size-5 text-amber-500"
                />
                <div className="space-y-1">
                    <CardTitle className="text-base">
                        Submissions are temporarily disabled
                    </CardTitle>
                    <CardDescription>
                        User-submitted scholarships are currently turned off by
                        the platform administrators. Please check back later or
                        browse existing scholarships in the meantime.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <Button asChild variant="outline">
                    <Link href="/scholarships">Browse scholarships</Link>
                </Button>
            </CardContent>
        </Card>
    );
}
