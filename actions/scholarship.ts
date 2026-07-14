"use server";

/**
 * Scholarship Server Actions.
 *
 * Implements the admin CRUD + approval surface for scholarships, plus the
 * authenticated-user submission action gated behind the
 * `userSubmittedScholarships` feature flag.
 *
 * Conventions (see design.md "Action Result Pattern"):
 *   - Each action begins with `requireSession()` / `requireRole()` inside a
 *     try / catch that maps thrown `UNAUTHORIZED`/`FORBIDDEN` errors to the
 *     corresponding `ActionResult` failures.
 *   - Inputs are validated with `safeParse`; failures return a `VALIDATION`
 *     `ActionResult` with field errors flattened.
 *   - Caught Prisma errors are mapped via `prismaErrorToActionResult`.
 *   - After writes we invalidate the relevant cache tags / paths.
 *
 * Validates: Requirements 11.2, 17.2, 17.6, 21.3, 21.5, 33.1, 34.4.
 */

import { revalidateTag } from "next/cache";

import { NotificationType } from "@/generated/prisma/client";
import { CACHE_TAGS } from "@/lib/cache";
import prisma from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/rbac";
import {
  fail,
  ok,
  prismaErrorToActionResult,
} from "@/lib/action-result";
import {
  getScholarshipById,
  type ScholarshipDetailDTO,
} from "@/lib/queries/scholarship";
import {
  ScholarshipSchema,
  ScholarshipSubmissionSchema,
  ScholarshipUpdateSchema,
  type ScholarshipInput,
  type ScholarshipSubmissionInput,
  type ScholarshipUpdateInput,
} from "@/lib/validation/scholarship";
import type { ActionResult } from "@/types/api";

/* ------------------------------------------------------------------ */
/*                       getCompareScholarships                        */
/* ------------------------------------------------------------------ */

/**
 * Public read for the comparison page (Req 15.6, 15.7).
 *
 * Accepts the ordered list of scholarship ids the client has hydrated
 * from `localStorage` and returns the matching `ScholarshipDetailDTO[]`
 * preserving input order. Items that no longer exist or are no longer
 * approved are dropped silently — the comparison page will render only
 * the survivors and the cart will reconcile on next mutation.
 *
 * Implemented as a thin wrapper around `getScholarshipById` so we keep
 * the public approval gate (`isApproved=true`) and the existing rating
 * aggregation logic in one place.
 *
 * Caching: not wrapped in `unstable_cache`; the underlying detail lookup
 * already benefits from request-scoped Prisma reads and we want fresh
 * deadlines/ratings on the comparison surface.
 */
const COMPARE_MAX_IDS = 3;

export async function getCompareScholarships(
  ids: string[],
): Promise<ActionResult<ScholarshipDetailDTO[]>> {
  // Defensive validation: the client may pass through tampered storage
  // values, so reject anything that isn't a small array of non-empty
  // string ids.
  if (!Array.isArray(ids)) {
    return fail<ScholarshipDetailDTO[]>(
      "VALIDATION",
      "Expected an array of scholarship ids.",
    );
  }
  if (ids.length === 0) {
    return ok<ScholarshipDetailDTO[]>([]);
  }
  if (ids.length > COMPARE_MAX_IDS) {
    return fail<ScholarshipDetailDTO[]>(
      "VALIDATION",
      `At most ${COMPARE_MAX_IDS} scholarships can be compared at once.`,
    );
  }

  // Deduplicate while preserving the first-seen order so the table
  // columns line up with the user's selection.
  const seen = new Set<string>();
  const orderedIds: string[] = [];
  for (const candidate of ids) {
    if (typeof candidate !== "string" || candidate.length === 0) {
      return fail<ScholarshipDetailDTO[]>(
        "VALIDATION",
        "Scholarship ids must be non-empty strings.",
      );
    }
    if (!seen.has(candidate)) {
      seen.add(candidate);
      orderedIds.push(candidate);
    }
  }

  try {
    const results = await Promise.all(
      orderedIds.map((id) => getScholarshipById(id)),
    );
    // Drop any entry that was deleted, unapproved, or otherwise not
    // visible to the public catalog. Order is preserved by `map`.
    const items = results.filter(
      (entry): entry is ScholarshipDetailDTO => entry !== null,
    );
    return ok(items);
  } catch (error) {
    return prismaErrorToActionResult<ScholarshipDetailDTO[]>(error);
  }
}

/* ------------------------------------------------------------------ */
/*                            createScholarship                        */
/* ------------------------------------------------------------------ */

/**
 * Admin-only scholarship create.
 *
 * Validates the payload against `ScholarshipSchema`, persists a new row
 * (defaulting `isApproved` to `true` for admin-authored entries unless the
 * caller explicitly passed a value), and revalidates the public listing
 * cache tag (Req 17.2).
 */
export async function createScholarship(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  let session;
  try {
    session = await requireRole(["ADMIN"]);
  } catch (error) {
    const code =
      (error as Error).message === "FORBIDDEN" ? "FORBIDDEN" : "UNAUTHORIZED";
    return fail<{ id: string }>(code, code === "FORBIDDEN"
      ? "Admin access required."
      : "Authentication required.");
  }

  const parsed = ScholarshipSchema.safeParse(input);
  if (!parsed.success) {
    return fail<{ id: string }>(
      "VALIDATION",
      "Invalid scholarship input.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const data: ScholarshipInput = parsed.data;
  try {
    const created = await prisma.scholarship.create({
      data: {
        title: data.title,
        universityId: data.universityId,
        category: data.category,
        subject: data.subject,
        description: data.description,
        stipend: data.stipend,
        coverage: data.coverage,
        location: data.location,
        requirements: data.requirements,
        deadline: data.deadline,
        applicationLink: data.applicationLink,
        fees: data.fees,
        image: data.image ?? null,
        // Admin-created entries default to approved unless explicitly false.
        isApproved: data.isApproved ?? true,
        postedById: session.user.id,
      },
      select: { id: true },
    });

    revalidateTag(CACHE_TAGS.scholarshipList, "max");
    return ok({ id: created.id });
  } catch (error) {
    return prismaErrorToActionResult<{ id: string }>(error);
  }
}

/* ------------------------------------------------------------------ */
/*                            updateScholarship                        */
/* ------------------------------------------------------------------ */

/**
 * Admin-only partial update. Validates with `ScholarshipUpdateSchema` so
 * any subset of fields may be patched. Revalidates the list tag and the
 * per-detail tag (Req 17.2).
 */
export async function updateScholarship(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["ADMIN"]);
  } catch (error) {
    const code =
      (error as Error).message === "FORBIDDEN" ? "FORBIDDEN" : "UNAUTHORIZED";
    return fail<{ id: string }>(code, code === "FORBIDDEN"
      ? "Admin access required."
      : "Authentication required.");
  }

  if (!id) return fail<{ id: string }>("VALIDATION", "Scholarship id is required.");

  const parsed = ScholarshipUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return fail<{ id: string }>(
      "VALIDATION",
      "Invalid scholarship input.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const data: ScholarshipUpdateInput = parsed.data;
  try {
    const updated = await prisma.scholarship.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.universityId !== undefined && { universityId: data.universityId }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.stipend !== undefined && { stipend: data.stipend }),
        ...(data.coverage !== undefined && { coverage: data.coverage }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.requirements !== undefined && { requirements: data.requirements }),
        ...(data.deadline !== undefined && { deadline: data.deadline }),
        ...(data.applicationLink !== undefined && { applicationLink: data.applicationLink }),
        ...(data.fees !== undefined && { fees: data.fees }),
        ...(data.image !== undefined && { image: data.image ?? null }),
        ...(data.isApproved !== undefined && { isApproved: data.isApproved }),
      },
      select: { id: true },
    });

    revalidateTag(CACHE_TAGS.scholarshipList, "max");
    revalidateTag(CACHE_TAGS.scholarshipDetail(updated.id), "max");
    return ok({ id: updated.id });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return fail<{ id: string }>("NOT_FOUND", "Scholarship not found.");
    }
    return prismaErrorToActionResult<{ id: string }>(error);
  }
}

/* ------------------------------------------------------------------ */
/*                            deleteScholarship                        */
/* ------------------------------------------------------------------ */

/**
 * Admin-only delete. Cascades to Review/Bookmark/Application/Payment via
 * the schema's `onDelete: Cascade` rules (Req 2.11). Revalidates the
 * public listing tag.
 */
export async function deleteScholarship(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["ADMIN"]);
  } catch (error) {
    const code =
      (error as Error).message === "FORBIDDEN" ? "FORBIDDEN" : "UNAUTHORIZED";
    return fail<{ id: string }>(code, code === "FORBIDDEN"
      ? "Admin access required."
      : "Authentication required.");
  }

  if (!id) return fail<{ id: string }>("VALIDATION", "Scholarship id is required.");

  try {
    await prisma.scholarship.delete({ where: { id } });
    revalidateTag(CACHE_TAGS.scholarshipList, "max");
    revalidateTag(CACHE_TAGS.scholarshipDetail(id), "max");
    return ok({ id });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return fail<{ id: string }>("NOT_FOUND", "Scholarship not found.");
    }
    return prismaErrorToActionResult<{ id: string }>(error);
  }
}

/* ------------------------------------------------------------------ */
/*                            approveScholarship                       */
/* ------------------------------------------------------------------ */

/**
 * Admin-only approve. Sets `isApproved = true` so the scholarship surfaces
 * in public listings (Req 21.3). Emits a `SCHOLARSHIP_APPROVED` notification
 * for the original submitter (Req 33.1). Invalidates list + sitemap caches.
 */
export async function approveScholarship(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["ADMIN"]);
  } catch (error) {
    const code =
      (error as Error).message === "FORBIDDEN" ? "FORBIDDEN" : "UNAUTHORIZED";
    return fail<{ id: string }>(code, code === "FORBIDDEN"
      ? "Admin access required."
      : "Authentication required.");
  }

  if (!id) return fail<{ id: string }>("VALIDATION", "Scholarship id is required.");

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.scholarship.update({
        where: { id },
        data: { isApproved: true },
        select: { id: true, title: true, postedById: true },
      });

      // Emit a notification to the submitter so they see the approval
      // in their bell + notifications page (Req 33.1).
      await tx.notification.create({
        data: {
          userId: row.postedById,
          type: NotificationType.SCHOLARSHIP_APPROVED,
          message: `Your scholarship "${row.title}" has been approved.`,
          relatedEntityId: row.id,
        },
      });

      return row;
    });

    revalidateTag(CACHE_TAGS.scholarshipList, "max");
    revalidateTag(CACHE_TAGS.scholarshipDetail(updated.id), "max");
    revalidateTag(CACHE_TAGS.sitemap, "max");
    return ok({ id: updated.id });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return fail<{ id: string }>("NOT_FOUND", "Scholarship not found.");
    }
    return prismaErrorToActionResult<{ id: string }>(error);
  }
}

/* ------------------------------------------------------------------ */
/*                             rejectScholarship                       */
/* ------------------------------------------------------------------ */

/**
 * Admin-only reject. Per design (Req 21.5), reject deletes the scholarship
 * record outright. Invalidates list + sitemap caches.
 */
export async function rejectScholarship(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["ADMIN"]);
  } catch (error) {
    const code =
      (error as Error).message === "FORBIDDEN" ? "FORBIDDEN" : "UNAUTHORIZED";
    return fail<{ id: string }>(code, code === "FORBIDDEN"
      ? "Admin access required."
      : "Authentication required.");
  }

  if (!id) return fail<{ id: string }>("VALIDATION", "Scholarship id is required.");

  try {
    await prisma.scholarship.delete({ where: { id } });
    revalidateTag(CACHE_TAGS.scholarshipList, "max");
    revalidateTag(CACHE_TAGS.scholarshipDetail(id), "max");
    revalidateTag(CACHE_TAGS.sitemap, "max");
    return ok({ id });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return fail<{ id: string }>("NOT_FOUND", "Scholarship not found.");
    }
    return prismaErrorToActionResult<{ id: string }>(error);
  }
}

/* ------------------------------------------------------------------ */
/*                       createScholarshipSubmission                   */
/* ------------------------------------------------------------------ */

/**
 * Authenticated-user submission. Validates with the narrower
 * `ScholarshipSubmissionSchema` (max 2000 char description, future-dated
 * deadline, etc. per Req 11.1, 11.4), forces `isApproved=false` and
 * `postedById=session.user.id`, and is gated by the
 * `userSubmittedScholarships` feature flag (Req 11.2, 34.4).
 *
 * The submission needs values for the admin-only fields the schema
 * requires for Scholarship rows (`stipend`, `coverage`, `location`,
 * `requirements`, `fees`); we synthesize sensible defaults so the
 * pending row remains valid and admins can fill the rest in during
 * approval.
 */
export async function createScholarshipSubmission(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail<{ id: string }>("UNAUTHORIZED", "Authentication required.");
  }

  // Feature flag enforcement (Req 34.4 / Property 33).
  try {
    const settings = await prisma.platformSettings.findUnique({
      where: { id: "singleton" },
      select: { featureUserSubmittedEnabled: true },
    });
    // If the row does not exist, fall back to the schema default of `true`.
    if (settings && settings.featureUserSubmittedEnabled === false) {
      return fail<{ id: string }>(
        "FEATURE_DISABLED",
        "User-submitted scholarships are currently disabled.",
      );
    }
  } catch (error) {
    return prismaErrorToActionResult<{ id: string }>(error);
  }

  const parsed = ScholarshipSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return fail<{ id: string }>(
      "VALIDATION",
      "Invalid scholarship submission.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const data: ScholarshipSubmissionInput = parsed.data;
  try {
    const created = await prisma.scholarship.create({
      data: {
        title: data.title,
        universityId: data.universityId,
        category: data.category,
        subject: data.subject,
        description: data.description,
        // User-submitted forms only collect a subset of fields; the rest
        // are seeded with safe defaults that admins can refine during
        // approval (Req 11.1).
        stipend: data.stipend ?? 0,
        coverage: "To be reviewed",
        location: "To be reviewed",
        requirements: "To be reviewed",
        deadline: data.deadline,
        applicationLink: data.applicationLink,
        fees: 0,
        image: null,
        isApproved: false,
        postedById: session.user.id,
      },
      select: { id: true },
    });

    revalidateTag(CACHE_TAGS.scholarshipList, "max");
    return ok({ id: created.id });
  } catch (error) {
    return prismaErrorToActionResult<{ id: string }>(error);
  }
}
