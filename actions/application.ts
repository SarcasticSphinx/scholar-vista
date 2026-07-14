"use server";

/**
 * Application Server Actions.
 *
 * - `submitApplication(scholarshipId, input)` — authenticated USER+ submission.
 *   Validates `ApplicationSchema`, rejects duplicates via the
 *   `(userId, scholarshipId)` unique constraint (Req 7.6), creates the row,
 *   and revalidates `/my-applications`.
 *
 * - `updateApplicationStatus(id, status, feedback?)` — admin/moderator-only
 *   status update enforcing the state machine PENDING→PROCESSING and
 *   PROCESSING→{COMPLETED|REJECTED} (Req 20.3). Creates an
 *   `APPLICATION_STATUS_CHANGE` notification for the applicant (Req 33.1)
 *   and revalidates the relevant paths.
 *
 * Validates: Requirements 7.4, 20.3, 20.5, 33.1.
 */

import { revalidatePath } from "next/cache";

import {
  ApplicationStatus,
  NotificationType,
} from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { hasUserApplied } from "@/lib/queries/application";
import { requireRole, requireSession } from "@/lib/rbac";
import {
  fail,
  ok,
  prismaErrorToActionResult,
} from "@/lib/action-result";
import {
  ApplicationSchema,
  ApplicationStatusUpdateSchema,
  type ApplicationInput,
  type ApplicationStatus as ApplicationStatusInput,
} from "@/lib/validation/application";
import type { ActionResult } from "@/types/api";

/* ------------------------------------------------------------------ */
/*                         Status transition matrix                    */
/* ------------------------------------------------------------------ */

/**
 * Allowed transitions from each starting status. Terminal statuses
 * (`COMPLETED`, `REJECTED`) admit no further transitions (Req 20.3).
 */
const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.PENDING]: [ApplicationStatus.PROCESSING],
  [ApplicationStatus.PROCESSING]: [
    ApplicationStatus.COMPLETED,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.COMPLETED]: [],
  [ApplicationStatus.REJECTED]: [],
};

/* ------------------------------------------------------------------ */
/*                            submitApplication                        */
/* ------------------------------------------------------------------ */

/**
 * Submit an application for a scholarship on behalf of the authenticated
 * user. Per Req 7.6, the second submission for `(userId, scholarshipId)`
 * is rejected as a `DUPLICATE` error.
 */
export async function submitApplication(
  scholarshipId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail<{ id: string }>("UNAUTHORIZED", "Authentication required.");
  }

  if (!scholarshipId) {
    return fail<{ id: string }>("VALIDATION", "Scholarship id is required.");
  }

  const parsed = ApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return fail<{ id: string }>(
      "VALIDATION",
      "Invalid application input.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const data: ApplicationInput = parsed.data;
  const userId = session.user.id;

  try {
    // Pre-check via the unique constraint-backed lookup so we can return a
    // clean `DUPLICATE` error before relying on the DB to raise P2002.
    if (await hasUserApplied(userId, scholarshipId)) {
      return fail<{ id: string }>(
        "DUPLICATE",
        "You have already applied to this scholarship.",
      );
    }

    const created = await prisma.application.create({
      data: {
        userId,
        scholarshipId,
        applicantName: data.applicantName,
        phone: data.phone,
        gender: data.gender,
        applyingDegree: data.applyingDegree,
        // SSC / HSC results are stored as VARCHAR(20) on the model so the
        // numeric value is serialised through `String(...)`.
        sscResult: String(data.sscResult),
        hscResult: String(data.hscResult),
        subjectCategory: data.subjectCategory,
        village: data.village,
        district: data.district,
        country: data.country,
      },
      select: { id: true },
    });

    revalidatePath("/my-applications");
    return ok({ id: created.id });
  } catch (error) {
    return prismaErrorToActionResult<{ id: string }>(error);
  }
}

/* ------------------------------------------------------------------ */
/*                         updateApplicationStatus                     */
/* ------------------------------------------------------------------ */

/**
 * Admin / moderator action to advance an application's status. Enforces
 * the transition matrix declared above; an attempted illegal transition
 * returns `INVALID_TRANSITION`. On success, persists the new status (and
 * optional feedback), creates an `APPLICATION_STATUS_CHANGE` notification
 * for the applicant (Req 33.1), and revalidates the admin + user-facing
 * paths.
 */
export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatusInput,
  feedback?: string | null,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["ADMIN", "MODERATOR"]);
  } catch (error) {
    const code =
      (error as Error).message === "FORBIDDEN" ? "FORBIDDEN" : "UNAUTHORIZED";
    return fail<{ id: string }>(code, code === "FORBIDDEN"
      ? "Admin or moderator access required."
      : "Authentication required.");
  }

  if (!id) return fail<{ id: string }>("VALIDATION", "Application id is required.");

  const parsed = ApplicationStatusUpdateSchema.safeParse({ status, feedback });
  if (!parsed.success) {
    return fail<{ id: string }>(
      "VALIDATION",
      "Invalid status update.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const existing = await prisma.application.findUnique({
      where: { id },
      select: { id: true, userId: true, scholarshipId: true, status: true },
    });
    if (!existing) {
      return fail<{ id: string }>("NOT_FOUND", "Application not found.");
    }

    const next = parsed.data.status as ApplicationStatus;
    const allowed = ALLOWED_TRANSITIONS[existing.status];
    if (!allowed.includes(next)) {
      return fail<{ id: string }>(
        "INVALID_TRANSITION",
        `Cannot transition application from ${existing.status} to ${next}.`,
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.application.update({
        where: { id },
        data: {
          status: next,
          feedback: parsed.data.feedback ?? null,
        },
        select: { id: true, userId: true, scholarshipId: true, status: true },
      });

      await tx.notification.create({
        data: {
          userId: row.userId,
          type: NotificationType.APPLICATION_STATUS_CHANGE,
          message: `Your application status changed to ${row.status}.`,
          relatedEntityId: row.id,
        },
      });

      return row;
    });

    revalidatePath("/my-applications");
    revalidatePath("/dashboard/applications");
    revalidatePath(`/dashboard/applications/${updated.id}`);
    return ok({ id: updated.id });
  } catch (error) {
    return prismaErrorToActionResult<{ id: string }>(error);
  }
}
