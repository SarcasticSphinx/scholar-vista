"use server";

/**
 * Platform settings Server Action.
 *
 * `updateSettings(input)` upserts the singleton `PlatformSettings` row
 * (Req 2.8, 34.2). After persisting, every cache that depends on a
 * feature flag or the platform name/description is invalidated so the
 * UI reflects the new configuration on next request.
 *
 * Validates: Requirements 34.2, 34.3, 34.4.
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
  PlatformSettingsSchema,
  type PlatformSettingsInput,
} from "@/lib/validation/settings";
import type { ActionResult } from "@/types/api";

const SETTINGS_SINGLETON_ID = "singleton";

export async function updateSettings(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["ADMIN"]);
  } catch (error) {
    const code =
      (error as Error).message === "FORBIDDEN" ? "FORBIDDEN" : "UNAUTHORIZED";
    return fail<{ id: string }>(
      code,
      code === "FORBIDDEN"
        ? "Admin access required."
        : "Authentication required.",
    );
  }

  const parsed = PlatformSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail<{ id: string }>(
      "VALIDATION",
      "Invalid platform settings.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const data: PlatformSettingsInput = parsed.data;
  try {
    const upserted = await prisma.platformSettings.upsert({
      where: { id: SETTINGS_SINGLETON_ID },
      create: {
        id: SETTINGS_SINGLETON_ID,
        platformName: data.platformName,
        platformDescription: data.platformDescription,
        featureUserSubmittedEnabled: data.featureUserSubmittedEnabled,
        featurePaymentEnabled: data.featurePaymentEnabled,
      },
      update: {
        platformName: data.platformName,
        platformDescription: data.platformDescription,
        featureUserSubmittedEnabled: data.featureUserSubmittedEnabled,
        featurePaymentEnabled: data.featurePaymentEnabled,
      },
      select: { id: true },
    });

    // Settings affect the public listing (feature flags) and home stats
    // (platform name surfaces in metadata). Refresh both.
    revalidateTag(CACHE_TAGS.scholarshipList, "max");
    revalidateTag(CACHE_TAGS.universityList, "max");
    revalidateTag(CACHE_TAGS.homeStats, "max");
    revalidatePath("/dashboard/settings");
    return ok({ id: upserted.id });
  } catch (error) {
    return prismaErrorToActionResult<{ id: string }>(error);
  }
}
