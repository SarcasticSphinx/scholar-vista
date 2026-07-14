"use server";

/**
 * University Server Actions.
 *
 * Admin-only CRUD over `University` plus the partner /
 * `acceptingApplications` toggles. Each mutation revalidates the
 * `universityList` (and `partnerUnis` where relevant) cache tags so the
 * public catalog and home-page partner rail refresh on next request.
 *
 * Validates: Requirements 18.2, 18.3, 18.5, 18.6.
 */

import { revalidatePath, revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import {
  fail,
  ok,
  prismaErrorToActionResult,
} from "@/lib/action-result";
import {
  UniversitySchema,
  UniversityUpdateSchema,
  type UniversityInput,
  type UniversityUpdateInput,
} from "@/lib/validation/university";
import type { ActionResult } from "@/types/api";

function denyResult<T>(error: unknown): ActionResult<T> {
  const code =
    (error as Error).message === "FORBIDDEN" ? "FORBIDDEN" : "UNAUTHORIZED";
  return fail<T>(
    code,
    code === "FORBIDDEN"
      ? "Admin access required."
      : "Authentication required.",
  );
}

function invalidateUniversityCaches(): void {
  revalidateTag(CACHE_TAGS.universityList, "max");
  revalidateTag(CACHE_TAGS.partnerUnis, "max");
}

/* ------------------------------------------------------------------ */
/*                            createUniversity                         */
/* ------------------------------------------------------------------ */

export async function createUniversity(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["ADMIN"]);
  } catch (error) {
    return denyResult<{ id: string }>(error);
  }

  const parsed = UniversitySchema.safeParse(input);
  if (!parsed.success) {
    return fail<{ id: string }>(
      "VALIDATION",
      "Invalid university input.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const data: UniversityInput = parsed.data;
  try {
    const created = await prisma.university.create({
      data: {
        name: data.name,
        logo: data.logo ?? null,
        contactEmail: data.contactEmail,
        website: data.website,
        description: data.description,
        address: data.address,
        country: data.country,
        city: data.city,
        worldRank: data.worldRank,
        type: data.type,
        establishedYear: data.establishedYear,
        isPartner: data.isPartner,
        acceptingApplications: data.acceptingApplications,
      },
      select: { id: true },
    });

    invalidateUniversityCaches();
    return ok({ id: created.id });
  } catch (error) {
    return prismaErrorToActionResult<{ id: string }>(error);
  }
}

/* ------------------------------------------------------------------ */
/*                            updateUniversity                         */
/* ------------------------------------------------------------------ */

export async function updateUniversity(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["ADMIN"]);
  } catch (error) {
    return denyResult<{ id: string }>(error);
  }

  if (!id) return fail<{ id: string }>("VALIDATION", "University id is required.");

  const parsed = UniversityUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return fail<{ id: string }>(
      "VALIDATION",
      "Invalid university input.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const data: UniversityUpdateInput = parsed.data;
  try {
    const updated = await prisma.university.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.logo !== undefined && { logo: data.logo ?? null }),
        ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.worldRank !== undefined && { worldRank: data.worldRank }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.establishedYear !== undefined && { establishedYear: data.establishedYear }),
        ...(data.isPartner !== undefined && { isPartner: data.isPartner }),
        ...(data.acceptingApplications !== undefined && {
          acceptingApplications: data.acceptingApplications,
        }),
      },
      select: { id: true },
    });

    invalidateUniversityCaches();
    revalidatePath(`/universities/${updated.id}`);
    return ok({ id: updated.id });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return fail<{ id: string }>("NOT_FOUND", "University not found.");
    }
    return prismaErrorToActionResult<{ id: string }>(error);
  }
}

/* ------------------------------------------------------------------ */
/*                            deleteUniversity                         */
/* ------------------------------------------------------------------ */

export async function deleteUniversity(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["ADMIN"]);
  } catch (error) {
    return denyResult<{ id: string }>(error);
  }

  if (!id) return fail<{ id: string }>("VALIDATION", "University id is required.");

  try {
    await prisma.university.delete({ where: { id } });
    invalidateUniversityCaches();
    revalidateTag(CACHE_TAGS.scholarshipList, "max");
    return ok({ id });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return fail<{ id: string }>("NOT_FOUND", "University not found.");
    }
    // P2003: a Scholarship still references this university (onDelete:
    // Restrict on the scholarship side). Surface that as INVALID_REFERENCE
    // so the UI can ask the admin to delete the scholarships first.
    return prismaErrorToActionResult<{ id: string }>(error);
  }
}

/* ------------------------------------------------------------------ */
/*                       toggleAcceptingApplications                   */
/* ------------------------------------------------------------------ */

/**
 * Flip the `acceptingApplications` flag on a university. Returns the new
 * state so the dashboard can update its toggle without a refetch.
 */
export async function toggleAcceptingApplications(
  id: string,
): Promise<ActionResult<{ acceptingApplications: boolean }>> {
  try {
    await requireRole(["ADMIN"]);
  } catch (error) {
    return denyResult<{ acceptingApplications: boolean }>(error);
  }

  if (!id) {
    return fail<{ acceptingApplications: boolean }>(
      "VALIDATION",
      "University id is required.",
    );
  }

  try {
    const existing = await prisma.university.findUnique({
      where: { id },
      select: { acceptingApplications: true },
    });
    if (!existing) {
      return fail<{ acceptingApplications: boolean }>(
        "NOT_FOUND",
        "University not found.",
      );
    }

    const updated = await prisma.university.update({
      where: { id },
      data: { acceptingApplications: !existing.acceptingApplications },
      select: { acceptingApplications: true },
    });

    invalidateUniversityCaches();
    revalidatePath(`/universities/${id}`);
    return ok({ acceptingApplications: updated.acceptingApplications });
  } catch (error) {
    return prismaErrorToActionResult<{ acceptingApplications: boolean }>(error);
  }
}
