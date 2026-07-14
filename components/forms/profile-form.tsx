"use client";

/**
 * Profile form (client).
 *
 * React Hook Form + Zod (`ProfileSchema`) form that lets the authenticated
 * user edit their ScholarVista profile fields. The email is rendered as a
 * read-only field directly on the page (Req 9.8); only mutable fields live
 * inside this form.
 *
 * Profile-picture uploads use the typed UploadThing `UploadButton` bound to
 * the `profileImage` route. On `onClientUploadComplete` we immediately call
 * the `updateProfile` Server Action with the new URL so the picture is
 * persisted even when the rest of the form isn't yet submitted (Req 26.6 —
 * a successful upload replaces the existing image). Submitting the form
 * persists the remaining fields together.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.8, 26.1, 26.6
 */

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateProfile } from "@/actions/user";
import { ProfileSchema, type ProfileInput } from "@/lib/validation/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadButton, validateBeforeUpload } from "@/lib/uploadthing";

interface ProfileFormProps {
    /** Current profile values used to seed RHF default state. */
    defaultValues: {
        name: string;
        profilePicture: string | null;
        educationalLevel: string | null;
        major: string | null;
        country: string | null;
        city: string | null;
        /** ISO-8601 date string or null. */
        dateOfBirth: string | null;
    };
}

/** Convert an ISO timestamp (or null) into a `YYYY-MM-DD` string for `<input type="date">`. */
function isoToDateInput(value: string | null): string {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
}

/** Coerce form values to the shape `ProfileSchema` expects. */
function buildPayload(values: ProfileFormValues): ProfileInput {
    return {
        name: values.name,
        profilePicture: values.profilePicture ?? null,
        educationalLevel: values.educationalLevel?.trim() || null,
        major: values.major?.trim() || null,
        country: values.country?.trim() || null,
        city: values.city?.trim() || null,
        dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth) : null,
    };
}

/** Form-level shape: keeps `dateOfBirth` as the `YYYY-MM-DD` input string. */
interface ProfileFormValues {
    name: string;
    profilePicture: string | null;
    educationalLevel: string;
    major: string;
    country: string;
    city: string;
    /** `YYYY-MM-DD` for the native date input. */
    dateOfBirth: string;
}

export function ProfileForm({ defaultValues }: ProfileFormProps) {
    const router = useRouter();

    const form = useForm<ProfileFormValues>({
        // We deliberately do not use `zodResolver(ProfileSchema)` because
        // the form keeps `dateOfBirth` as a `YYYY-MM-DD` string and lets
        // optional text fields stay empty. We coerce + validate inside
        // `onSubmit` via `buildPayload` + `ProfileSchema.safeParse` so the
        // exact same Zod errors that the Server Action would emit get
        // surfaced on the right fields.
        defaultValues: {
            name: defaultValues.name ?? "",
            profilePicture: defaultValues.profilePicture ?? null,
            educationalLevel: defaultValues.educationalLevel ?? "",
            major: defaultValues.major ?? "",
            country: defaultValues.country ?? "",
            city: defaultValues.city ?? "",
            dateOfBirth: isoToDateInput(defaultValues.dateOfBirth),
        },
    });

    const profilePicture = form.watch("profilePicture");
    const submitting = form.formState.isSubmitting;
    const [uploading, setUploading] = React.useState(false);

    const onSubmit = async (values: ProfileFormValues) => {
        const payload = buildPayload(values);

        // Run schema once on the client so we can map errors back onto
        // fields exactly the way the Server Action would.
        const parsed = ProfileSchema.safeParse(payload);
        if (!parsed.success) {
            const fieldErrors = parsed.error.flatten().fieldErrors;
            for (const [field, messages] of Object.entries(fieldErrors)) {
                if (messages?.length) {
                    form.setError(field as keyof ProfileFormValues, {
                        message: messages[0],
                    });
                }
            }
            return;
        }

        const result = await updateProfile(parsed.data);
        if (!result.ok) {
            if (result.error.fieldErrors) {
                for (const [field, messages] of Object.entries(
                    result.error.fieldErrors,
                )) {
                    if (messages?.length) {
                        form.setError(field as keyof ProfileFormValues, {
                            message: messages[0],
                        });
                    }
                }
            }
            toast.error(
                result.error.message || "Could not save your profile.",
            );
            return;
        }

        toast.success("Profile updated");
        router.refresh();
    };

    /**
     * Persist a freshly uploaded profile picture URL by calling the Server
     * Action immediately. This guarantees Req 26.6 (replacement on success)
     * even if the user never submits the rest of the form.
     */
    const persistProfilePicture = React.useCallback(
        async (url: string) => {
            const current = form.getValues();
            form.setValue("profilePicture", url, { shouldDirty: true });

            const payload = buildPayload({ ...current, profilePicture: url });
            const parsed = ProfileSchema.safeParse(payload);
            if (!parsed.success) {
                // The new URL is valid; this branch only fires if the form
                // already has invalid pending values. Fall back to keeping
                // the URL in form state so the user can submit later.
                toast.success("Profile picture uploaded");
                return;
            }

            const result = await updateProfile(parsed.data);
            if (!result.ok) {
                toast.error(
                    result.error.message ||
                    "Picture uploaded, but saving failed.",
                );
                return;
            }
            toast.success("Profile picture updated");
            router.refresh();
        },
        [form, router],
    );

    return (
        <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
            noValidate
        >
            <div className="space-y-2">
                <Label>Profile picture</Label>
                <div className="flex items-start gap-4">
                    <div className="relative h-20 w-20 overflow-hidden rounded-full border bg-muted">
                        {profilePicture ? (
                            <Image
                                src={profilePicture}
                                alt=""
                                fill
                                sizes="80px"
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                No image
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <UploadButton
                            endpoint="profileImage"
                            onBeforeUploadBegin={validateBeforeUpload({
                                onReject: (_file, result) =>
                                    toast.error(result.message),
                            })}
                            onUploadBegin={() => setUploading(true)}
                            onUploadError={(error) => {
                                setUploading(false);
                                toast.error(
                                    error?.message || "Upload failed. Please retry.",
                                );
                            }}
                            onClientUploadComplete={(res) => {
                                setUploading(false);
                                const url = res?.[0]?.serverData?.url;
                                if (!url) {
                                    toast.error("Upload failed. Please retry.");
                                    return;
                                }
                                void persistProfilePicture(url);
                            }}
                            appearance={{
                                button: "ut-ready:bg-primary ut-ready:text-primary-foreground ut-uploading:bg-primary/70",
                            }}
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                            JPEG, PNG, or WebP, up to 5 MB. Uploading replaces
                            your current picture.
                        </p>
                    </div>
                </div>
                {form.formState.errors.profilePicture && (
                    <p className="text-sm text-destructive">
                        {form.formState.errors.profilePicture.message}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="name">
                    Display name <span aria-hidden>*</span>
                </Label>
                <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    disabled={submitting}
                    aria-invalid={!!form.formState.errors.name}
                    {...form.register("name")}
                />
                {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                        {form.formState.errors.name.message}
                    </p>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="educationalLevel">Educational level</Label>
                    <Input
                        id="educationalLevel"
                        type="text"
                        placeholder="e.g. Bachelor's"
                        disabled={submitting}
                        aria-invalid={!!form.formState.errors.educationalLevel}
                        {...form.register("educationalLevel")}
                    />
                    {form.formState.errors.educationalLevel && (
                        <p className="text-sm text-destructive">
                            {form.formState.errors.educationalLevel.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="major">Major</Label>
                    <Input
                        id="major"
                        type="text"
                        placeholder="e.g. Computer Science"
                        disabled={submitting}
                        aria-invalid={!!form.formState.errors.major}
                        {...form.register("major")}
                    />
                    {form.formState.errors.major && (
                        <p className="text-sm text-destructive">
                            {form.formState.errors.major.message}
                        </p>
                    )}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                        id="country"
                        type="text"
                        autoComplete="country-name"
                        disabled={submitting}
                        aria-invalid={!!form.formState.errors.country}
                        {...form.register("country")}
                    />
                    {form.formState.errors.country && (
                        <p className="text-sm text-destructive">
                            {form.formState.errors.country.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                        id="city"
                        type="text"
                        autoComplete="address-level2"
                        disabled={submitting}
                        aria-invalid={!!form.formState.errors.city}
                        {...form.register("city")}
                    />
                    {form.formState.errors.city && (
                        <p className="text-sm text-destructive">
                            {form.formState.errors.city.message}
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of birth</Label>
                <Input
                    id="dateOfBirth"
                    type="date"
                    autoComplete="bday"
                    disabled={submitting}
                    aria-invalid={!!form.formState.errors.dateOfBirth}
                    {...form.register("dateOfBirth")}
                />
                {form.formState.errors.dateOfBirth && (
                    <p className="text-sm text-destructive">
                        {form.formState.errors.dateOfBirth.message}
                    </p>
                )}
            </div>

            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={submitting || uploading}
                    className="min-w-32"
                >
                    {submitting ? (
                        <>
                            <Loader2
                                className="mr-2 h-4 w-4 animate-spin"
                                aria-hidden
                            />
                            Saving...
                        </>
                    ) : (
                        "Save changes"
                    )}
                </Button>
            </div>
        </form>
    );
}
