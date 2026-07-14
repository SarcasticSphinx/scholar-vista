import { z } from "zod";

/**
 * Scholarship validation schemas.
 *
 * Encodes the field constraints from the design document:
 *   - title:           max 200 chars
 *   - subject:         max 100 chars
 *   - description:     max 5000 chars (admin) / 2000 chars (user submission, Req 11.1)
 *   - coverage:        max 500 chars
 *   - location:        max 200 chars
 *   - requirements:    max 3000 chars
 *   - applicationLink: valid URL, max 500 chars
 *   - stipend:         0.00 to 999_999_999.99 (Decimal(11, 2))
 *   - fees:            0.00 to 999_999.99 (Decimal(8, 2))
 *   - deadline:        DateTime; user submissions require a FUTURE date (Req 11.4)
 *
 * Validates: Requirements 2.3, 11.3, 11.4, 17.2, 17.3, 21.3
 */

export const ScholarshipCategoryEnum = z.enum([
  "UNDERGRADUATE",
  "MASTERS",
  "PHD",
  "POSTDOC",
  "EXCHANGE",
  "SHORT_COURSE",
]);
export type ScholarshipCategory = z.infer<typeof ScholarshipCategoryEnum>;

const STIPEND_MAX = 999_999_999.99;
const FEES_MAX = 999_999.99;

/** Admin create/edit schema (Requirement 17.2 / 17.3). */
export const ScholarshipSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  universityId: z.string().min(1, "University is required"),
  category: ScholarshipCategoryEnum,
  subject: z.string().min(1, "Subject is required").max(100),
  description: z.string().min(1, "Description is required").max(5000),
  stipend: z.coerce.number().min(0).max(STIPEND_MAX),
  coverage: z.string().min(1, "Coverage is required").max(500),
  location: z.string().min(1, "Location is required").max(200),
  requirements: z.string().min(1, "Requirements are required").max(3000),
  deadline: z.coerce.date(),
  applicationLink: z.url().max(500),
  fees: z.coerce.number().min(0).max(FEES_MAX),
  image: z.url().max(500).optional().nullable(),
  isApproved: z.boolean().optional(),
});
export type ScholarshipInput = z.infer<typeof ScholarshipSchema>;

/** Admin partial-edit schema. */
export const ScholarshipUpdateSchema = ScholarshipSchema.partial();
export type ScholarshipUpdateInput = z.infer<typeof ScholarshipUpdateSchema>;

/**
 * User-submitted "Create Scholarship" form (Requirement 11.1, 11.3, 11.4).
 *
 * Per Req 11.1, description is constrained to max 2000 chars and the form is
 * narrower than the admin schema. Per Req 11.4, deadline must be a future date
 * and applicationLink must be a valid URL.
 */
export const ScholarshipSubmissionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  universityId: z.string().min(1, "University is required"),
  category: ScholarshipCategoryEnum,
  subject: z.string().min(1, "Subject is required").max(100),
  description: z.string().min(1, "Description is required").max(2000),
  stipend: z.coerce.number().min(0).max(STIPEND_MAX).optional(),
  deadline: z.coerce
    .date()
    .refine((d) => d.getTime() > Date.now(), {
      message: "Deadline must be a future date",
    }),
  applicationLink: z.url().max(500),
});
export type ScholarshipSubmissionInput = z.infer<typeof ScholarshipSubmissionSchema>;

/** Search/list filters parsed from URL query params (Req 5.2 - 5.8). */
export const ScholarshipFiltersSchema = z.object({
  q: z.string().min(2).max(200).optional(),
  category: ScholarshipCategoryEnum.optional(),
  country: z.string().max(100).optional(),
  funding: z.string().max(50).optional(),
  deadline: z.enum(["7", "30", "90"]).optional(),
  sort: z.enum(["deadline", "rating", "createdAt"]).default("createdAt"),
  page: z.coerce.number().int().min(1).default(1),
});
export type ScholarshipFilters = z.infer<typeof ScholarshipFiltersSchema>;
