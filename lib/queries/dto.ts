/**
 * Shared DTO shapes returned by `lib/queries/*` modules.
 *
 * The query layer exists to convert Prisma row shapes into stable, JSON-safe
 * DTOs that RSC pages and Server Actions can consume without having to know
 * about Prisma types. Two transformations always happen at this seam:
 *   - `Decimal` columns (`stipend`, `fees`, `Payment.amount`) → `string`.
 *   - `DateTime` columns (`createdAt`, `deadline`, etc.) → ISO `string`.
 *
 * Keeping DTOs in one place avoids drift across query modules and matches
 * the "Domain DTOs" section of the design document.
 *
 * Validates: Requirement 28.5 (no Prisma types leak past the query layer).
 */

import type {
  ApplicationStatus,
  ApplyingDegree,
  Gender,
  NotificationType,
  PaymentStatus,
  ScholarshipCategory,
  UniversityType,
  UserRole,
} from "@/generated/prisma/client";

/** Pagination envelope used by every paginated query. */
export interface PageResult<T> {
  /** The slice of rows for the requested page. */
  items: T[];
  /** Total number of rows matching the filter (pre-pagination). */
  total: number;
  /** 1-indexed page number actually returned (clamped to last page). */
  page: number;
  /** Page size used for this query. */
  pageSize: number;
  /** Total number of pages (`Math.max(1, ceil(total / pageSize))`). */
  totalPages: number;
}

/** Compact university representation embedded in cards. */
export interface UniversityRefDTO {
  id: string;
  name: string;
  logo: string | null;
  country: string;
  type: UniversityType;
}

/**
 * University card DTO returned by the universities listing page (Req 13.2)
 * and the home page partner-universities section (Req 4.5).
 *
 * Includes everything the card UI renders: identity, location, world rank,
 * institutional type, and partnership status.
 */
export interface UniversityCardDTO {
  id: string;
  name: string;
  logo: string | null;
  country: string;
  city: string;
  worldRank: number;
  type: UniversityType;
  isPartner: boolean;
}

/**
 * Full university DTO returned by the university detail page (Req 14.1)
 * and admin edit forms (Req 18.3).
 */
export interface UniversityDTO {
  id: string;
  name: string;
  logo: string | null;
  contactEmail: string;
  website: string;
  description: string;
  address: string;
  country: string;
  city: string;
  worldRank: number;
  type: UniversityType;
  establishedYear: number;
  isPartner: boolean;
  acceptingApplications: boolean;
  /** ISO-8601. */
  createdAt: string;
  /** ISO-8601. */
  updatedAt: string;
}

/** Card-level scholarship DTO used by listings and bookmark pages. */
export interface ScholarshipCardDTO {
  id: string;
  title: string;
  university: UniversityRefDTO;
  category: ScholarshipCategory;
  subject: string;
  /** ISO-8601. */
  deadline: string;
  /** Decimal serialized as fixed-point string. */
  stipend: string;
  /** Decimal serialized as fixed-point string. */
  fees: string;
  location: string;
  image: string | null;
  isApproved: boolean;
  /** ISO-8601. */
  createdAt: string;
}

/** Compact user representation embedded inside reviews/applications. */
export interface UserRefDTO {
  id: string;
  name: string;
  email: string;
  image: string | null;
  profilePicture: string | null;
  role: UserRole;
}

/** Detailed application DTO with scholarship + user populated. */
export interface ApplicationDTO {
  id: string;
  userId: string;
  scholarshipId: string;
  applicantName: string;
  phone: string;
  gender: Gender;
  applyingDegree: ApplyingDegree;
  sscResult: string;
  hscResult: string;
  subjectCategory: string;
  village: string;
  district: string;
  country: string;
  status: ApplicationStatus;
  paymentStatus: PaymentStatus;
  feedback: string | null;
  /** ISO-8601. */
  createdAt: string;
  /** ISO-8601. */
  updatedAt: string;
  scholarship: ScholarshipCardDTO;
  user: UserRefDTO;
}

/** Slim variant for the user's My Applications page (no nested user). */
export interface MyApplicationDTO {
  id: string;
  scholarshipId: string;
  status: ApplicationStatus;
  paymentStatus: PaymentStatus;
  feedback: string | null;
  /** ISO-8601. */
  createdAt: string;
  scholarship: ScholarshipCardDTO;
}

/** Review with embedded author. */
export interface ReviewWithUserDTO {
  id: string;
  userId: string;
  scholarshipId: string;
  ratingPoint: number;
  comment: string;
  /** ISO-8601. */
  createdAt: string;
  user: UserRefDTO;
}

/** Review listed under "My Reviews" with embedded scholarship. */
export interface ReviewWithScholarshipDTO {
  id: string;
  userId: string;
  scholarshipId: string;
  ratingPoint: number;
  comment: string;
  /** ISO-8601. */
  createdAt: string;
  scholarship: ScholarshipCardDTO;
}

/** Notification row DTO. */
export interface NotificationDTO {
  id: string;
  userId: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  relatedEntityId: string | null;
  /** ISO-8601. */
  createdAt: string;
}

/** Profile DTO with derived counts. */
export interface UserProfileDTO {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: UserRole;
  profilePicture: string | null;
  educationalLevel: string | null;
  major: string | null;
  country: string | null;
  city: string | null;
  /** ISO-8601 or null. */
  dateOfBirth: string | null;
  /** ISO-8601. */
  createdAt: string;
  /** ISO-8601. */
  updatedAt: string;
  counts: {
    applications: number;
    bookmarks: number;
  };
}

/** Admin-list user DTO with light counts. */
export interface AdminUserDTO {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  image: string | null;
  /** ISO-8601. */
  createdAt: string;
}

/** Single bucket in a time-series report. */
export interface TimeBucket {
  /** ISO-8601 timestamp anchored at the start of the bucket window. */
  bucketIso: string;
  count: number;
}

/** Bucket of the application-trend-by-month query. */
export interface MonthBucket {
  /** ISO-8601 timestamp at the first millisecond of the month (UTC). */
  monthIso: string;
  count: number;
}

/**
 * Convert a Decimal-like value (Prisma `Decimal` or string/number) to a
 * fixed-point string with two decimal places. Centralised so every DTO uses
 * the same representation.
 */
export function decimalToString(
  value: { toFixed: (digits: number) => string } | number | string,
): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toFixed(2);
  return value.toFixed(2);
}

/** Convert a Date to ISO-8601 string. */
export function dateToIso(value: Date): string {
  return value.toISOString();
}

/** Convert a nullable Date to a nullable ISO-8601 string. */
export function nullableDateToIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/** Compute the `totalPages` field consistently across queries. */
export function totalPagesOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

/**
 * Clamp a requested page number to the valid range `[1, totalPages]`. When
 * the dataset is empty `totalPages` resolves to 1 so the first page is
 * always returned.
 *
 * Validates: Requirement 5.11 (last-page clamping for paginated queries).
 */
export function clampPage(requested: number, totalPages: number): number {
  if (!Number.isFinite(requested) || requested < 1) return 1;
  return Math.min(Math.floor(requested), totalPages);
}
