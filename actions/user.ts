"use server";

/**
 * User Server Actions.
 *
 * - `updateProfile(input)` — authenticated user updates their own profile.
 *   Validates with `ProfileSchema` (Req 9.5) and revalidates `/profile`.
 *
 * - `changeRole(targetUserId, newRole)` — admin-only role change. Per
 *   Req 19.2 / Property 32, an admin may not change their own role; the
 *   action returns `FORBIDDEN_SELF_CHANGE` in that case.
 *
 * Validates: Requirements 9.2, 19.2, 19.4.
 */

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/rbac";
import {
  fail,
  ok,
  prismaErrorToActionResult,
} from "@/lib/action-result";
import {
  ProfileSchema,
  UserRoleEnum,
  type ProfileInput,
  type UserRole,
} from "@/lib/validation/user";
import type { ActionResult } from "@/types/api";

/* ------------------------------------------------------------------ */
/*                              updateProfile                          */
/* ------------------------------------------------------------------ */

export async function updateProfile(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail<{ id: string }>("UNAUTHORIZED", "Authentication required.");
  }

  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) {
    return fail<{ id: string }>(
      "VALIDATION",
      "Invalid profile input.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const data: ProfileInput = parsed.data;
  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name,
        profilePicture: data.profilePicture ?? null,
        educationalLevel: data.educationalLevel ?? null,
        major: data.major ?? null,
        country: data.country ?? null,
        city: data.city ?? null,
        dateOfBirth: data.dateOfBirth ?? null,
      },
      select: { id: true },
    });

    revalidatePath("/profile");
    return ok({ id: updated.id });
  } catch (error) {
    return prismaErrorToActionResult<{ id: string }>(error);
  }
}

/* ------------------------------------------------------------------ */
/*                              changeRole                             */
/* ------------------------------------------------------------------ */

/**
 * Admin-only role change. Self-change is rejected with
 * `FORBIDDEN_SELF_CHANGE` (Property 32, Req 19.2). On success the target
 * user's role is updated and the admin user list page is revalidated.
 */
export async function changeRole(
  targetUserId: string,
  newRole: UserRole,
): Promise<ActionResult<{ id: string; role: UserRole }>> {
  let session;
  try {
    session = await requireRole(["ADMIN"]);
  } catch (error) {
    const code =
      (error as Error).message === "FORBIDDEN" ? "FORBIDDEN" : "UNAUTHORIZED";
    return fail<{ id: string; role: UserRole }>(
      code,
      code === "FORBIDDEN"
        ? "Admin access required."
        : "Authentication required.",
    );
  }

  if (!targetUserId) {
    return fail<{ id: string; role: UserRole }>(
      "VALIDATION",
      "Target user id is required.",
    );
  }

  const parsedRole = UserRoleEnum.safeParse(newRole);
  if (!parsedRole.success) {
    return fail<{ id: string; role: UserRole }>(
      "VALIDATION",
      "Invalid role.",
    );
  }

  if (targetUserId === session.user.id) {
    return fail<{ id: string; role: UserRole }>(
      "FORBIDDEN_SELF_CHANGE",
      "Admins may not change their own role.",
    );
  }

  try {
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: parsedRole.data },
      select: { id: true, role: true },
    });

    revalidatePath("/dashboard/users");
    return ok({ id: updated.id, role: updated.role as UserRole });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return fail<{ id: string; role: UserRole }>("NOT_FOUND", "User not found.");
    }
    return prismaErrorToActionResult<{ id: string; role: UserRole }>(error);
  }
}
