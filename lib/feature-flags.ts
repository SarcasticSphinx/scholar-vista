/**
 * Feature flag helpers.
 *
 * `isEnabled(flag)` reads the singleton `PlatformSettings` row and returns
 * whether the named flag is active. Falls back to `true` (enabled) when the
 * settings row does not yet exist so a fresh deployment works out of the box.
 *
 * Supported flags (Req 34.3):
 *   - `userSubmittedScholarships` → `featureUserSubmittedEnabled`
 *   - `paymentProcessing`         → `featurePaymentEnabled`
 *
 * Validates: Requirements 34.3, Property 33.
 */

import prisma from "@/lib/prisma";
import type { FeatureFlag } from "@/lib/validation/settings";

const SETTINGS_ID = "singleton";

/**
 * Map from the public flag name to the Prisma column name.
 */
const FLAG_COLUMN_MAP: Record<FeatureFlag, "featureUserSubmittedEnabled" | "featurePaymentEnabled"> = {
  userSubmittedScholarships: "featureUserSubmittedEnabled",
  paymentProcessing: "featurePaymentEnabled",
};

/**
 * Return `true` when the named feature flag is enabled in `PlatformSettings`.
 * Defaults to `true` when the settings row is absent (fresh install).
 *
 * Validates: Requirements 34.3.
 */
export async function isEnabled(flag: FeatureFlag): Promise<boolean> {
  const column = FLAG_COLUMN_MAP[flag];
  try {
    const settings = await prisma.platformSettings.findUnique({
      where: { id: SETTINGS_ID },
      select: { [column]: true },
    });
    if (!settings) return true; // default: enabled
    return (settings as Record<string, boolean>)[column] ?? true;
  } catch {
    // If the DB is unavailable, fail open so the UI doesn't break.
    return true;
  }
}

/**
 * Return the full feature-flag state for the settings form.
 * Returns defaults when the row does not exist.
 */
export async function getFeatureFlags(): Promise<{
  userSubmittedScholarships: boolean;
  paymentProcessing: boolean;
}> {
  try {
    const settings = await prisma.platformSettings.findUnique({
      where: { id: SETTINGS_ID },
      select: {
        featureUserSubmittedEnabled: true,
        featurePaymentEnabled: true,
      },
    });
    return {
      userSubmittedScholarships: settings?.featureUserSubmittedEnabled ?? true,
      paymentProcessing: settings?.featurePaymentEnabled ?? true,
    };
  } catch {
    return { userSubmittedScholarships: true, paymentProcessing: true };
  }
}
