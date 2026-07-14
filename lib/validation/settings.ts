import { z } from "zod";

/**
 * Platform settings validation (single-row PlatformSettings table).
 *
 * Field constraints (Req 2.8 design, 34.2):
 *   - platformName:        1-100 chars
 *   - platformDescription: 1-500 chars
 *   - featureUserSubmittedEnabled: boolean
 *   - featurePaymentEnabled:       boolean
 *
 * Validates: Requirements 34.2, 34.3
 */

export const PlatformSettingsSchema = z.object({
  platformName: z
    .string()
    .min(1, "Platform name is required")
    .max(100, "Platform name cannot exceed 100 characters"),
  platformDescription: z
    .string()
    .min(1, "Platform description is required")
    .max(500, "Platform description cannot exceed 500 characters"),
  featureUserSubmittedEnabled: z.boolean(),
  featurePaymentEnabled: z.boolean(),
});
export type PlatformSettingsInput = z.infer<typeof PlatformSettingsSchema>;

export const PlatformSettingsUpdateSchema = PlatformSettingsSchema.partial();
export type PlatformSettingsUpdateInput = z.infer<typeof PlatformSettingsUpdateSchema>;

/** Feature flag identifier union (Req 34.3). */
export const FeatureFlagEnum = z.enum([
  "userSubmittedScholarships",
  "paymentProcessing",
]);
export type FeatureFlag = z.infer<typeof FeatureFlagEnum>;
