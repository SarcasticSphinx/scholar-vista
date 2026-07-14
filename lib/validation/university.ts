import { z } from "zod";

/**
 * University validation schemas.
 *
 * Field constraints (Req 2.4, 18.2):
 *   - name:            max 200 chars
 *   - logo:            optional URL string
 *   - contactEmail:    valid email, max 254 chars
 *   - website:         valid URL, max 500 chars
 *   - description:     max 3000 chars
 *   - address:         max 300 chars
 *   - country:         max 100 chars
 *   - city:            max 100 chars
 *   - worldRank:       integer, 1 to 30000
 *   - type:            PUBLIC | PRIVATE | COMMUNITY
 *   - establishedYear: integer, 1000 to current year
 *   - isPartner:       boolean (default false)
 *   - acceptingApplications: boolean (default true)
 *
 * Validates: Requirements 2.4, 18.2
 */

export const UniversityTypeEnum = z.enum(["PUBLIC", "PRIVATE", "COMMUNITY"]);
export type UniversityType = z.infer<typeof UniversityTypeEnum>;

const currentYear = () => new Date().getFullYear();

export const UniversitySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  logo: z.url().max(500).optional().nullable(),
  contactEmail: z.email().max(254),
  website: z.url().max(500),
  description: z.string().min(1, "Description is required").max(3000),
  address: z.string().min(1, "Address is required").max(300),
  country: z.string().min(1, "Country is required").max(100),
  city: z.string().min(1, "City is required").max(100),
  worldRank: z.coerce.number().int().min(1).max(30_000),
  type: UniversityTypeEnum,
  establishedYear: z.coerce
    .number()
    .int()
    .min(1000)
    .refine((y) => y <= currentYear(), {
      message: "Established year cannot be in the future",
    }),
  isPartner: z.boolean().default(false),
  acceptingApplications: z.boolean().default(true),
});
export type UniversityInput = z.infer<typeof UniversitySchema>;

export const UniversityUpdateSchema = UniversitySchema.partial();
export type UniversityUpdateInput = z.infer<typeof UniversityUpdateSchema>;

/** Search/list filters from URL query params (Req 13.4, 13.5). */
export const UniversityFiltersSchema = z.object({
  q: z.string().min(2).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
});
export type UniversityFilters = z.infer<typeof UniversityFiltersSchema>;
