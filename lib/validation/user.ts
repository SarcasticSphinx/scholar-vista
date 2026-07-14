import { z } from "zod";

/**
 * User profile + authentication validation schemas.
 *
 * Profile constraints (Req 2.1, 9.5):
 *   - displayName:      2-100 chars
 *   - profilePicture:   URL string (UploadThing CDN)
 *   - educationalLevel: max 100 chars
 *   - major:            max 100 chars
 *   - country:          max 100 chars
 *   - city:             max 100 chars
 *   - dateOfBirth:      not in the future; not more than 120 years in the past
 *
 * Email is read-only on the profile page (Req 9.8) and is therefore not a
 * field of `ProfileSchema`. Authentication constraints come from Req 3.1, 3.10.
 *
 * Validates: Requirements 2.1, 3.1, 3.10, 9.5, 19.2 (role enum)
 */

export const UserRoleEnum = z.enum(["ADMIN", "MODERATOR", "USER"]);
export type UserRole = z.infer<typeof UserRoleEnum>;

const PASSWORD = z.string().min(8, "Password must be at least 8 characters").max(128);

const MAX_AGE_YEARS = 120;

const dobRefinement = z
  .coerce.date()
  .refine((d) => d.getTime() <= Date.now(), {
    message: "Date of birth cannot be in the future",
  })
  .refine(
    (d) => {
      const earliest = new Date();
      earliest.setFullYear(earliest.getFullYear() - MAX_AGE_YEARS);
      return d.getTime() >= earliest.getTime();
    },
    { message: `Date of birth cannot be more than ${MAX_AGE_YEARS} years ago` },
  );

/** Profile update form (Req 9.5). Email is omitted per Req 9.8. */
export const ProfileSchema = z.object({
  name: z.string().min(2).max(100),
  profilePicture: z.url().max(500).optional().nullable(),
  educationalLevel: z.string().max(100).optional().nullable(),
  major: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  dateOfBirth: dobRefinement.optional().nullable(),
});
export type ProfileInput = z.infer<typeof ProfileSchema>;

/* ---------- Authentication ---------- */

/** Sign-up form (Req 3.1, 3.3). */
export const SignUpSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email().max(254),
  password: PASSWORD,
});
export type SignUpInput = z.infer<typeof SignUpSchema>;

/** Sign-in form (Req 3.1). */
export const SignInSchema = z.object({
  email: z.email().max(254),
  password: PASSWORD,
});
export type SignInInput = z.infer<typeof SignInSchema>;

/** Change-password form (Req 3.10). */
export const ChangePasswordSchema = z
  .object({
    currentPassword: PASSWORD,
    newPassword: PASSWORD,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "New password must differ from current password",
    path: ["newPassword"],
  });
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

/* ---------- Admin user management (Req 19.2, 19.4) ---------- */

/**
 * Admin role-change input. Self-change is rejected in the Server Action
 * with a `FORBIDDEN_SELF_CHANGE` error (Req 19.2).
 */
export const RoleChangeSchema = z.object({
  userId: z.string().min(1),
  role: UserRoleEnum,
});
export type RoleChangeInput = z.infer<typeof RoleChangeSchema>;
