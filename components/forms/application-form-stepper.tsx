"use client";

/**
 * Multi-step application form (client).
 *
 * React Hook Form + Zod (`ApplicationFormSchema`) wizard for submitting an
 * application against a single scholarship. Three sequential sections
 * gate progression via `form.trigger(stepFields)` so users cannot
 * advance past invalid input (Req 7.1, 7.2).
 *
 * Steps:
 *   1. Personal info — `applicantName`, `phone`, `gender`.
 *   2. Academic     — `applyingDegree`, `sscResult`, `hscResult`,
 *                     `subjectCategory`.
 *   3. Address      — `village`, `district`, `country`. Submission
 *                     happens here and calls the
 *                     `submitApplication(scholarshipId, formData)`
 *                     Server Action (Req 7.4).
 *
 * Behaviour:
 *   - Client-side validation mirrors the server schema so users see
 *     specific error messages adjacent to each invalid field
 *     (Req 7.3, 7.5).
 *   - On `DUPLICATE` (Req 7.6) the form swaps in an inline banner
 *     with a link to `/my-applications` and disables further attempts.
 *   - On success a toast is shown and the user is redirected to
 *     `/my-applications` within 3 seconds (Req 7.7).
 *   - `VALIDATION` field errors emitted by the server are mapped onto
 *     the matching field. Generic failures preserve user input.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { submitApplication } from "@/actions/application";
import {
    ApplicationFormSchema,
    type ApplicationFormInput,
} from "@/lib/validation/application";
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
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

/* ------------------------------------------------------------------ */
/* Step definitions                                                    */
/* ------------------------------------------------------------------ */

/**
 * Field name groupings per step. Used by `form.trigger(stepFields)` to
 * validate only the current step before allowing progression
 * (Req 7.2).
 */
const STEP_FIELDS = [
    ["applicantName", "phone", "gender"],
    ["applyingDegree", "sscResult", "hscResult", "subjectCategory"],
    ["village", "district", "country"],
] as const satisfies ReadonlyArray<ReadonlyArray<keyof ApplicationFormInput>>;

type StepIndex = 0 | 1 | 2;
const TOTAL_STEPS = STEP_FIELDS.length;

const STEP_TITLES = [
    "Personal information",
    "Academic details",
    "Address",
] as const;

const STEP_DESCRIPTIONS = [
    "Tell us who's applying.",
    "Share your academic background.",
    "Where can we reach you?",
] as const;

const GENDER_OPTIONS: Array<{ value: ApplicationFormInput["gender"]; label: string }> = [
    { value: "MALE", label: "Male" },
    { value: "FEMALE", label: "Female" },
    { value: "OTHER", label: "Other" },
];

const DEGREE_OPTIONS: Array<{
    value: ApplicationFormInput["applyingDegree"];
    label: string;
}> = [
        { value: "UNDERGRADUATE", label: "Undergraduate" },
        { value: "MASTERS", label: "Masters" },
        { value: "PHD", label: "PhD" },
        { value: "POSTDOC", label: "Postdoc" },
    ];

/** Redirect delay after a successful submission (Req 7.7 — within 3s). */
const REDIRECT_DELAY_MS = 1200;

const GENERIC_ERROR =
    "Submission failed. Please review the form and try again.";

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export interface ApplicationFormStepperProps {
    /** Scholarship the application will be attached to. */
    scholarshipId: string;
}

export function ApplicationFormStepper({
    scholarshipId,
}: ApplicationFormStepperProps) {
    const router = useRouter();

    /** Current visible step (0-indexed). */
    const [step, setStep] = React.useState<StepIndex>(0);
    /**
     * Set when the server reports a `DUPLICATE` error. The form is then
     * locked behind an inline banner to surface Req 7.6.
     */
    const [duplicate, setDuplicate] = React.useState(false);

    const form = useForm<ApplicationFormInput>({
        resolver: zodResolver(ApplicationFormSchema),
        mode: "onBlur",
        defaultValues: {
            applicantName: "",
            phone: "",
            // RHF requires defined defaults; we cast empty strings into the
            // enum union and let the resolver flag them on submit/trigger.
            gender: "" as unknown as ApplicationFormInput["gender"],
            applyingDegree:
                "" as unknown as ApplicationFormInput["applyingDegree"],
            // sscResult/hscResult use a strict `z.number()` in the form
            // schema; `valueAsNumber: true` on the inputs feeds numbers
            // straight into the resolver. The Server Action keeps
            // `z.coerce.number()` for the network boundary.
            sscResult: 0,
            hscResult: 0,
            subjectCategory: "",
            village: "",
            district: "",
            country: "",
        },
    });

    const submitting = form.formState.isSubmitting;
    const rootError = form.formState.errors.root?.message;

    // Watch select fields so the shadcn Select reflects the current value.
    const genderValue = useWatch({ control: form.control, name: "gender" });
    const degreeValue = useWatch({
        control: form.control,
        name: "applyingDegree",
    });

    /* -------------------------------------------------------------- */
    /* Step navigation                                                 */
    /* -------------------------------------------------------------- */

    const goNext = async () => {
        const fields = STEP_FIELDS[step];
        const valid = await form.trigger(fields, { shouldFocus: true });
        if (!valid) return;
        if (step < TOTAL_STEPS - 1) {
            setStep((step + 1) as StepIndex);
        }
    };

    const goPrevious = () => {
        if (step > 0) setStep((step - 1) as StepIndex);
    };

    /* -------------------------------------------------------------- */
    /* Submission                                                      */
    /* -------------------------------------------------------------- */

    const onSubmit = async (values: ApplicationFormInput) => {
        if (duplicate) return;

        try {
            const result = await submitApplication(scholarshipId, values);

            if (result.ok) {
                toast.success("Application submitted");
                // Redirect to /my-applications within 3 seconds (Req 7.7).
                window.setTimeout(() => {
                    router.push("/my-applications");
                    router.refresh();
                }, REDIRECT_DELAY_MS);
                return;
            }

            const { code, message, fieldErrors } = result.error;

            if (code === "DUPLICATE") {
                setDuplicate(true);
                toast.error(
                    "You have already applied to this scholarship.",
                );
                return;
            }

            if (code === "VALIDATION" && fieldErrors) {
                let firstStep: StepIndex | null = null;
                for (const [field, errors] of Object.entries(fieldErrors)) {
                    if (!errors || errors.length === 0) continue;
                    form.setError(field as keyof ApplicationFormInput, {
                        message: errors[0],
                    });
                    // Surface the earliest invalid step so the user lands
                    // on a section where the offending field is visible.
                    const stepIdx = STEP_FIELDS.findIndex((fields) =>
                        (fields as readonly string[]).includes(field),
                    );
                    if (stepIdx !== -1) {
                        if (firstStep === null || stepIdx < firstStep) {
                            firstStep = stepIdx as StepIndex;
                        }
                    }
                }
                if (firstStep !== null) setStep(firstStep);
                toast.error(message || GENERIC_ERROR);
                return;
            }

            if (code === "UNAUTHORIZED") {
                router.push(
                    `/sign-in?returnUrl=${encodeURIComponent(
                        `/scholarships/${scholarshipId}/apply`,
                    )}`,
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

    /* -------------------------------------------------------------- */
    /* Duplicate banner                                                */
    /* -------------------------------------------------------------- */

    if (duplicate) {
        return <DuplicateApplicationBanner />;
    }

    /* -------------------------------------------------------------- */
    /* Render                                                          */
    /* -------------------------------------------------------------- */

    const isLastStep = step === TOTAL_STEPS - 1;
    const progress = ((step + 1) / TOTAL_STEPS) * 100;

    return (
        <Card>
            <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                        <CardTitle>{STEP_TITLES[step]}</CardTitle>
                        <CardDescription>
                            {STEP_DESCRIPTIONS[step]}
                        </CardDescription>
                    </div>
                    <span
                        className="text-sm font-medium text-muted-foreground"
                        aria-live="polite"
                    >
                        Step {step + 1} of {TOTAL_STEPS}
                    </span>
                </div>
                <Progress
                    value={progress}
                    aria-label={`Application progress: step ${step + 1} of ${TOTAL_STEPS}`}
                />
            </CardHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <CardContent className="space-y-5">
                    {/* Each step renders its own field group. We keep all
                        fields mounted (just hidden) so RHF retains values
                        across navigation; only the current step's controls
                        are visible to the user. */}
                    <div className={step === 0 ? "space-y-5" : "hidden"}>
                        <PersonalStep form={form} genderValue={genderValue} submitting={submitting} />
                    </div>
                    <div className={step === 1 ? "space-y-5" : "hidden"}>
                        <AcademicStep form={form} degreeValue={degreeValue} submitting={submitting} />
                    </div>
                    <div className={step === 2 ? "space-y-5" : "hidden"}>
                        <AddressStep form={form} submitting={submitting} />
                    </div>

                    {rootError ? (
                        <p role="alert" className="text-sm text-destructive">
                            {rootError}
                        </p>
                    ) : null}
                </CardContent>

                <CardFooter className="flex justify-between gap-3 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={goPrevious}
                        disabled={submitting || step === 0}
                    >
                        <ArrowLeft aria-hidden="true" className="mr-2 size-4" />
                        Previous
                    </Button>

                    {isLastStep ? (
                        <Button
                            type="submit"
                            disabled={submitting}
                            className="min-w-40"
                        >
                            {submitting ? (
                                <>
                                    <Loader2
                                        aria-hidden="true"
                                        className="mr-2 size-4 animate-spin"
                                    />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2
                                        aria-hidden="true"
                                        className="mr-2 size-4"
                                    />
                                    Submit application
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={goNext}
                            disabled={submitting}
                        >
                            Next
                            <ArrowRight
                                aria-hidden="true"
                                className="ml-2 size-4"
                            />
                        </Button>
                    )}
                </CardFooter>
            </form>
        </Card>
    );
}

/* ------------------------------------------------------------------ */
/* Step components                                                     */
/* ------------------------------------------------------------------ */

type StepFormHandle = ReturnType<typeof useForm<ApplicationFormInput>>;

interface PersonalStepProps {
    form: StepFormHandle;
    genderValue: ApplicationFormInput["gender"] | undefined;
    submitting: boolean;
}

function PersonalStep({ form, genderValue, submitting }: PersonalStepProps) {
    const errors = form.formState.errors;

    return (
        <>
            <div className="space-y-2">
                <Label htmlFor="applicantName">Full name</Label>
                <Input
                    id="applicantName"
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Maria Hernandez"
                    maxLength={100}
                    disabled={submitting}
                    aria-invalid={!!errors.applicantName}
                    {...form.register("applicantName")}
                />
                {errors.applicantName ? (
                    <p className="text-sm text-destructive">
                        {errors.applicantName.message}
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        Between 2 and 100 characters.
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+8801712345678"
                    disabled={submitting}
                    aria-invalid={!!errors.phone}
                    {...form.register("phone")}
                />
                {errors.phone ? (
                    <p className="text-sm text-destructive">
                        {errors.phone.message}
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        7 to 15 digits, with an optional leading &ldquo;+&rdquo;.
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                    value={
                        typeof genderValue === "string" && genderValue.length > 0
                            ? genderValue
                            : undefined
                    }
                    onValueChange={(value) =>
                        form.setValue(
                            "gender",
                            value as ApplicationFormInput["gender"],
                            { shouldValidate: true, shouldDirty: true },
                        )
                    }
                    disabled={submitting}
                >
                    <SelectTrigger
                        id="gender"
                        className="w-full"
                        aria-invalid={!!errors.gender}
                    >
                        <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                        {GENDER_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.gender ? (
                    <p className="text-sm text-destructive">
                        {errors.gender.message}
                    </p>
                ) : null}
            </div>
        </>
    );
}

interface AcademicStepProps {
    form: StepFormHandle;
    degreeValue: ApplicationFormInput["applyingDegree"] | undefined;
    submitting: boolean;
}

function AcademicStep({ form, degreeValue, submitting }: AcademicStepProps) {
    const errors = form.formState.errors;

    return (
        <>
            <div className="space-y-2">
                <Label htmlFor="applyingDegree">Degree applying for</Label>
                <Select
                    value={
                        typeof degreeValue === "string" && degreeValue.length > 0
                            ? degreeValue
                            : undefined
                    }
                    onValueChange={(value) =>
                        form.setValue(
                            "applyingDegree",
                            value as ApplicationFormInput["applyingDegree"],
                            { shouldValidate: true, shouldDirty: true },
                        )
                    }
                    disabled={submitting}
                >
                    <SelectTrigger
                        id="applyingDegree"
                        className="w-full"
                        aria-invalid={!!errors.applyingDegree}
                    >
                        <SelectValue placeholder="Select a degree" />
                    </SelectTrigger>
                    <SelectContent>
                        {DEGREE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.applyingDegree ? (
                    <p className="text-sm text-destructive">
                        {errors.applyingDegree.message}
                    </p>
                ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="sscResult">SSC result (GPA)</Label>
                    <Input
                        id="sscResult"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={0}
                        max={5}
                        placeholder="0.00 - 5.00"
                        disabled={submitting}
                        aria-invalid={!!errors.sscResult}
                        {...form.register("sscResult", { valueAsNumber: true })}
                    />
                    {errors.sscResult ? (
                        <p className="text-sm text-destructive">
                            {errors.sscResult.message}
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            GPA between 0.00 and 5.00.
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="hscResult">HSC result (GPA)</Label>
                    <Input
                        id="hscResult"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={0}
                        max={5}
                        placeholder="0.00 - 5.00"
                        disabled={submitting}
                        aria-invalid={!!errors.hscResult}
                        {...form.register("hscResult", { valueAsNumber: true })}
                    />
                    {errors.hscResult ? (
                        <p className="text-sm text-destructive">
                            {errors.hscResult.message}
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            GPA between 0.00 and 5.00.
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="subjectCategory">Subject category</Label>
                <Input
                    id="subjectCategory"
                    type="text"
                    placeholder="e.g. Computer Science"
                    maxLength={100}
                    disabled={submitting}
                    aria-invalid={!!errors.subjectCategory}
                    {...form.register("subjectCategory")}
                />
                {errors.subjectCategory ? (
                    <p className="text-sm text-destructive">
                        {errors.subjectCategory.message}
                    </p>
                ) : null}
            </div>
        </>
    );
}

interface AddressStepProps {
    form: StepFormHandle;
    submitting: boolean;
}

function AddressStep({ form, submitting }: AddressStepProps) {
    const errors = form.formState.errors;

    return (
        <>
            <div className="space-y-2">
                <Label htmlFor="village">Village or street</Label>
                <Input
                    id="village"
                    type="text"
                    autoComplete="address-line1"
                    maxLength={100}
                    disabled={submitting}
                    aria-invalid={!!errors.village}
                    {...form.register("village")}
                />
                {errors.village ? (
                    <p className="text-sm text-destructive">
                        {errors.village.message}
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        Up to 100 characters.
                    </p>
                )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="district">District</Label>
                    <Input
                        id="district"
                        type="text"
                        autoComplete="address-level2"
                        maxLength={100}
                        disabled={submitting}
                        aria-invalid={!!errors.district}
                        {...form.register("district")}
                    />
                    {errors.district ? (
                        <p className="text-sm text-destructive">
                            {errors.district.message}
                        </p>
                    ) : null}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                        id="country"
                        type="text"
                        autoComplete="country-name"
                        maxLength={100}
                        disabled={submitting}
                        aria-invalid={!!errors.country}
                        {...form.register("country")}
                    />
                    {errors.country ? (
                        <p className="text-sm text-destructive">
                            {errors.country.message}
                        </p>
                    ) : null}
                </div>
            </div>
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Duplicate banner                                                    */
/* ------------------------------------------------------------------ */

/**
 * Inline banner shown when the server reports a duplicate application
 * (Req 7.6). The link points users to `/my-applications` so they can
 * verify the existing submission.
 */
function DuplicateApplicationBanner() {
    return (
        <Card>
            <CardHeader className="flex-row items-start gap-3 space-y-0">
                <TriangleAlert
                    aria-hidden="true"
                    className="mt-0.5 size-5 text-amber-500"
                />
                <div className="space-y-1">
                    <CardTitle className="text-base">
                        You&apos;ve already applied
                    </CardTitle>
                    <CardDescription>
                        Our records show an existing application for this
                        scholarship. You can review its status from your
                        applications page.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <Button asChild variant="outline">
                    <Link href="/my-applications">View my applications</Link>
                </Button>
            </CardContent>
        </Card>
    );
}
