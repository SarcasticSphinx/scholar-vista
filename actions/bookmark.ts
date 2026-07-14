"use server";

/**
 * Bookmark Server Action.
 *
 * `toggleBookmark(scholarshipId)` toggles a `(userId, scholarshipId)`
 * bookmark for the authenticated user. If a row exists it is deleted; if
 * not, one is created (Req 8.1, 8.2). Returns the resulting bookmark state
 * so the client can flip its icon optimistically.
 *
 * Validates: Requirements 8.1, 8.2, 8.5.
 */

import { revalidatePath, revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache";
import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import {
  fail,
  ok,
  prismaErrorToActionResult,
} from "@/lib/action-result";
import type { ActionResult } from "@/types/api";

/**
 * Toggle the authenticated user's bookmark for `scholarshipId`. Returns
 * `{ bookmarked: boolean }` reflecting the post-toggle state.
 */
export async function toggleBookmark(
  scholarshipId: string,
): Promise<ActionResult<{ bookmarked: boolean }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail<{ bookmarked: boolean }>(
      "UNAUTHORIZED",
      "Authentication required.",
    );
  }

  if (!scholarshipId) {
    return fail<{ bookmarked: boolean }>(
      "VALIDATION",
      "Scholarship id is required.",
    );
  }

  const userId = session.user.id;

  try {
    const existing = await prisma.bookmark.findUnique({
      where: { userId_scholarshipId: { userId, scholarshipId } },
      select: { id: true },
    });

    let bookmarked: boolean;
    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      bookmarked = false;
    } else {
      await prisma.bookmark.create({
        data: { userId, scholarshipId },
        select: { id: true },
      });
      bookmarked = true;
    }

    revalidateTag(CACHE_TAGS.scholarshipDetail(scholarshipId), "max");
    revalidatePath("/my-bookmarks");
    return ok({ bookmarked });
  } catch (error) {
    return prismaErrorToActionResult<{ bookmarked: boolean }>(error);
  }
}
