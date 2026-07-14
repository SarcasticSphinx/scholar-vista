"use client";

/**
 * Review form (client).
 *
 * React Hook Form + Zod (`ReviewFormSchema`) used to add a review for a
 * single scholarship. The `scholarshipId` is supplied via props (sourced
 * from the route param on the detail page) so the form schema only owns
 * the user-editable fields.
 *
 * UX:
 *   - Star picker for `ratingPoint` (1–5, integer) with keyboard support
 *     (arrow keys + space/enter). Hover highlights a tentative selection
 *     without committing it until the user clicks.
 *   - Textarea for `comment` (10–1000 characters) with a live counter.
 *   - Submission is wrapped in `useTransition` so the button shows a
 *     pending spinner while the Server Action runs.
 *
 * Errors:
 *   - `VALIDATION` errors map back onto field messages via
 *     `form.setError`.
 *   - `DUPLICATE` (one-review-per-scholarship constraint, Req 10.3) is
 *     surfaced as an inline alert instead of a toast, since the user
 *     can't recover by retrying.
 *   - `UNAUTHORIZED` is unlikely here (the form lives behind the
 *     authenticated layout) but we still bounce to sign-in so the
 *     fallback is sane.
 *
 * Validates: Requirements 10.1, 10.3, 10.6.
 */

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { submitReview } from "@/actions/review";
import {
    ReviewFormSchema,
    type ReviewFormInput,
} from "@/lib/validation/review";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const RATING_VALUES = [1, 2, 3, 4, 5] as const;
const COMMENT_MIN = 10;
const COMMENT_MAX = 1000;

export interface ReviewFormProps {
    /** Scholarship the review will be attached to. */
    scholarshipId: string;
    /** Optional className override for the surrounding card. */
    className?: string;
    /** Callback fired on a successful submission (e.g. local UI update). */
    onSubmitted?: () => void;
}

/**
 * Client form for posting a review on a scholarship. Shows inline field
 * errors and a duplicate-review alert when the API rejects the second
 * attempt for the same `(userId, scholarshipId)` pair.
 */
export function ReviewForm({
    scholarshipId,
    className,
    onSubmitted,
}: ReviewFormProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [hover, setHover] = React.useState<number | null>(null);
    const [duplicate, setDuplicate] = React.useState(false);
    const [pending, startTransition] = React.useTransition();

    const form = useForm<ReviewFormInput>({
        resolver: zodResolver(ReviewFormSchema),
        defaultValues: { ratingPoint: 0, comment: "" },
    });

    const rating = form.watch("ratingPoint") ?? 0;
    const comment = form.watch("comment") ?? "";
    const commentLength = comment.length;
    const ratingError = form.formState.errors.ratingPoint?.message;
    const commentError = form.formState.errors.comment?.message;
    const rootError = form.formState.errors.root?.message;

    const onSubmit = (values: ReviewFormInput) => {
        setDuplicate(false);

        startTransition(async () => {
            const result = await submitReview({
                scholarshipId,
                ratingPoint: values.ratingPoint,
                comment: values.comment,
            });

            if (!result.ok) {
                switch (result.error.code) {
                    case "VALIDATION": {
                        const fieldErrors = result.error.fieldErrors ?? {};
                        for (const [field, messages] of Object.entries(
                            fieldErrors,
                        )) {
                            if (!messages?.length) continue;
                            if (field === "ratingPoint" || field === "comment") {
                                form.setError(field, { message: messages[0] });
                            }
                        }
                        if (!Object.keys(fieldErrors).length) {
                            form.setError("root", {
                                message: result.error.message,
                            });
                        }
                        return;
                    }
                    case "DUPLICATE":
                        setDuplicate(true);
                        return;
                    case "UNAUTHORIZED": {
                        const returnUrl = pathname ?? "/";
                        router.push(
                            `/sign-in?returnUrl=${encodeURIComponent(returnUrl)}`,
                        );
                        return;
                    }
                    default:
                        toast.error(
                            result.error.message ||
                            "Could not submit your review. Please try again.",
                        );
                        form.setError("root", {
                            message: result.error.message,
                        });
                        return;
                }
            }

            toast.success("Review submitted. Thanks for your feedback!");
            form.reset({ ratingPoint: 0, comment: "" });
            setHover(null);
            onSubmitted?.();
            // Refresh the server-rendered review list + average rating.
            router.refresh();
        });
    };

    const setRating = (value: number) => {
        form.setValue("ratingPoint", value, {
            shouldValidate: true,
            shouldDirty: true,
        });
    };

    const onStarKeyDown = (
        event: React.KeyboardEvent<HTMLButtonElement>,
        value: number,
    ) => {
        if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault();
            setRating(Math.min(5, value + 1));
        } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault();
            setRating(Math.max(1, value - 1));
        }
    };

    const displayRating = hover ?? rating;

    return (
        <Card className={cn("border", className)} data-slot="review-form">
            <CardHeader>
                <h3 className="text-lg font-semibold tracking-tight">
                    Leave a review
                </h3>
                <p className="text-sm text-muted-foreground">
                    Share your experience with this scholarship to help other
                    applicants.
                </p>
            </CardHeader>

            <CardContent>
                <form
                    noValidate
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-5"
                >
                    {/* Rating ------------------------------------------------- */}
                    <div className="space-y-2">
                        <Label htmlFor="review-rating">Rating</Label>
                        <div
                            id="review-rating"
                            role="radiogroup"
                            aria-label="Rating"
                            aria-invalid={Boolean(ratingError)}
                            className="flex items-center gap-1"
                            onMouseLeave={() => setHover(null)}
                        >
                            {RATING_VALUES.map((value) => {
                                const filled = value <= displayRating;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        role="radio"
                                        aria-checked={rating === value}
                                        aria-label={`${value} star${value === 1 ? "" : "s"}`}
                                        disabled={pending}
                                        onClick={() => setRating(value)}
                                        onMouseEnter={() => setHover(value)}
                                        onFocus={() => setHover(value)}
                                        onBlur={() => setHover(null)}
                                        onKeyDown={(event) =>
                                            onStarKeyDown(event, value)
                                        }
                                        className={cn(
                                            "rounded-md p-1 transition-colors outline-none",
                                            "focus-visible:ring-2 focus-visible:ring-ring",
                                            "disabled:cursor-not-allowed disabled:opacity-60",
                                        )}
                                    >
                                        <Star
                                            aria-hidden="true"
                                            className={cn(
                                                "size-7 transition-colors",
                                                filled
                                                    ? "fill-yellow-400 text-yellow-400"
                                                    : "text-muted-foreground/40",
                                            )}
                                        />
                                    </button>
                                );
                            })}
                            <span
                                className="ml-2 text-sm text-muted-foreground"
                                aria-live="polite"
                            >
                                {rating > 0 ? `${rating} / 5` : "Select a rating"}
                            </span>
                        </div>
                        {ratingError ? (
                            <p
                                role="alert"
                                className="text-sm text-destructive"
                            >
                                {ratingError}
                            </p>
                        ) : null}
                    </div>

                    {/* Comment ------------------------------------------------ */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="review-comment">Comment</Label>
                            <span
                                className={cn(
                                    "text-xs tabular-nums",
                                    commentLength > COMMENT_MAX
                                        ? "text-destructive"
                                        : "text-muted-foreground",
                                )}
                                aria-live="polite"
                            >
                                {commentLength}/{COMMENT_MAX}
                            </span>
                        </div>
                        <Textarea
                            id="review-comment"
                            rows={5}
                            placeholder="What did you find helpful or challenging about this scholarship?"
                            disabled={pending}
                            aria-invalid={Boolean(commentError)}
                            aria-describedby="review-comment-help"
                            {...form.register("comment")}
                        />
                        <p
                            id="review-comment-help"
                            className="text-xs text-muted-foreground"
                        >
                            Comments must be between {COMMENT_MIN} and {COMMENT_MAX}
                            {" "}characters.
                        </p>
                        {commentError ? (
                            <p
                                role="alert"
                                className="text-sm text-destructive"
                            >
                                {commentError}
                            </p>
                        ) : null}
                    </div>

                    {duplicate ? (
                        <p
                            role="alert"
                            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                        >
                            You have already reviewed this scholarship. Only one
                            review per scholarship is allowed.
                        </p>
                    ) : null}

                    {rootError && !duplicate ? (
                        <p
                            role="alert"
                            className="text-sm text-destructive"
                        >
                            {rootError}
                        </p>
                    ) : null}

                    <div className="flex items-center justify-end gap-2">
                        <Button
                            type="submit"
                            disabled={pending || duplicate}
                            className="min-w-32"
                        >
                            {pending ? (
                                <>
                                    <Loader2
                                        aria-hidden="true"
                                        className="size-4 animate-spin"
                                    />
                                    Submitting…
                                </>
                            ) : (
                                "Submit review"
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
