"use server";

/**
 * Review Server Action.
 *
 * `submitReview(input)` lets an authenticated user post a `1..5` rating +
 * comment for a scholarship. The unique `(userId, scholarshipId)`
 * constraint enforces "one review per user per scholarship" (Req 10.3);
 * a duplicate attempt returns the `DUPLICATE` error code so the client
 * can surface the existing review.
 *
 * After a successful insert we invalidate the scholarship detail cache
 * tag (`CACHE_TAGS.scholarshipDetail(id)`) so the detail page's
 * `averageRating` and review list pick up the new row on next render
 * (Req 10.5).
 *
 * Validates: Requirements 10.1, 10.3, 10.5, 10.6.
 */

import { revalidatePath, revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache";
import prisma from "@/lib/prisma";
import { hasUserReviewed } from "@/lib/queries/review";
import { requireSession } from "@/lib/rbac";
import {
  fail,
  ok,
  prismaErrorToActionResult,
} from "@/lib/action-result";
import {
  ReviewSchema,
  type ReviewInput,
} from "@/lib/validation/review";
import type { ActionResult } from "@/types/api";

export async function submitReview(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail<{ id: string }>("UNAUTHORIZED", "Authentication required.");
  }

  const parsed = ReviewSchema.safeParse(input);
  if (!parsed.success) {
    return fail<{ id: string }>(
      "VALIDATION",
      "Invalid review input.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const data: ReviewInput = parsed.data;
  const userId = session.user.id;

  try {
    if (await hasUserReviewed(userId, data.scholarshipId)) {
      return fail<{ id: string }>(
        "DUPLICATE",
        "You have already reviewed this scholarship.",
      );
    }

    const created = await prisma.review.create({
      data: {
        userId,
        scholarshipId: data.scholarshipId,
        ratingPoint: data.ratingPoint,
        comment: data.comment,
      },
      select: { id: true },
    });

    revalidatePath(`/scholarships/${data.scholarshipId}`);
    revalidatePath("/my-reviews");
    revalidateTag(CACHE_TAGS.scholarshipDetail(data.scholarshipId), "max");
    revalidateTag(CACHE_TAGS.scholarshipList, "max");
    return ok({ id: created.id });
  } catch (error) {
    return prismaErrorToActionResult<{ id: string }>(error);
  }
}
