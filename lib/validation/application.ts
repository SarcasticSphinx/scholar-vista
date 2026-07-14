import { z } from "zod";

/**
 * Application validation schemas.
 *
 * Field constraints (Req 2.5, 7.3):
 *   - applicantName:   2-100 chars
 *   - phone:           regex /^\+?\d{7,15}$/  (7-15 digits, optional leading "+")
 *   - gender:          MALE | FEMALE | OTHER
 *   - applyingDegree:  UNDERGRADUATE | MASTERS | PHD | POSTDOC
 *   - sscResult:       0.00 to 5.00 (GPA)
 *   - hscResult:       0.00 to 5.00 (GPA)
 *   - subjectCategory: 1-100 chars
 *   - village:         max 100 chars (Req 7.3)
 *   - district:        max 100 chars
 *   - country:         max 100 chars
 *
 * Status workflow (Req 20.3): only PENDING->PROCESSING, PROCESSING->COMPLETED,
 * PROCESSING->REJECTED transitions are permitted; enforced in actions/application.ts.
 *
 * Validates: Requirements 2.5, 7.3, 20.3, 20.5
 */

export const GenderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);
export type Gender = z.infer<typeof GenderEnum>;

export const ApplyingDegreeEnum = z.enum([
  "UNDERGRADUATE",
  "MASTERS",
  "PHD",
  "POSTDOC",
]);
export type ApplyingDegree = z.infer<typeof ApplyingDegreeEnum>;

export const ApplicationStatusEnum = z.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "REJECTED",
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusEnum>;

const PHONE_REGEX = /^\+?\d{7,15}$/;

/**
 * The full application form payload. Used verbatim by both the
 * RHF resolver and the Server Action's `safeParse` (see design.md
 * "Form Validation Pattern").
 */
export const ApplicationSchema = z.object({
  applicantName: z.string().min(2).max(100),
  phone: z.string().regex(PHONE_REGEX, "Phone must be 7-15 digits with an optional leading '+'"),
  gender: GenderEnum,
  applyingDegree: ApplyingDegreeEnum,
  sscResult: z.coerce.number().min(0).max(5),
  hscResult: z.coerce.number().min(0).max(5),
  subjectCategory: z.string().min(1).max(100),
  village: z.string().max(100),
  district: z.string().max(100),
  country: z.string().max(100),
});
export type ApplicationInput = z.infer<typeof ApplicationSchema>;

/** Multi-step gating helpers (Req 7.1, 7.2). */
export const ApplicationStep1Schema = ApplicationSchema.pick({
  applicantName: true,
  phone: true,
  gender: true,
});
export type ApplicationStep1Input = z.infer<typeof ApplicationStep1Schema>;

export const ApplicationStep2Schema = ApplicationSchema.pick({
  applyingDegree: true,
  sscResult: true,
  hscResult: true,
  subjectCategory: true,
});
export type ApplicationStep2Input = z.infer<typeof ApplicationStep2Schema>;

export const ApplicationStep3Schema = ApplicationSchema.pick({
  village: true,
  district: true,
  country: true,
});
export type ApplicationStep3Input = z.infer<typeof ApplicationStep3Schema>;

/**
 * Form-only schema used by the client application stepper.
 *
 * Uses strict `z.number()` (no coercion) for `sscResult` / `hscResult` so
 * the inferred input/output types match — `<input type="number">` plus
 * `valueAsNumber: true` already provides a number to the resolver. The
 * Server Action keeps `ApplicationSchema`'s `z.coerce.number()` for any
 * untyped `unknown` payloads coming from the network boundary.
 *
 * Validates: Requirements 7.2, 7.3.
 */
export const ApplicationFormSchema = z.object({
  applicantName: z.string().min(2).max(100),
  phone: z.string().regex(PHONE_REGEX, "Phone must be 7-15 digits with an optional leading '+'"),
  gender: GenderEnum,
  applyingDegree: ApplyingDegreeEnum,
  sscResult: z
    .number({ message: "SSC result is required" })
    .min(0, "SSC result must be between 0.00 and 5.00")
    .max(5, "SSC result must be between 0.00 and 5.00"),
  hscResult: z
    .number({ message: "HSC result is required" })
    .min(0, "HSC result must be between 0.00 and 5.00")
    .max(5, "HSC result must be between 0.00 and 5.00"),
  subjectCategory: z.string().min(1).max(100),
  village: z.string().max(100),
  district: z.string().max(100),
  country: z.string().max(100),
});
export type ApplicationFormInput = z.infer<typeof ApplicationFormSchema>;

/**
 * Admin status update with optional feedback (Req 20.3, 20.5).
 * The state machine is enforced in the Server Action layer.
 */
export const ApplicationStatusUpdateSchema = z.object({
  status: ApplicationStatusEnum,
  feedback: z.string().max(1000).optional().nullable(),
});
export type ApplicationStatusUpdateInput = z.infer<typeof ApplicationStatusUpdateSchema>;
