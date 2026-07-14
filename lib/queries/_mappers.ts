/**
 * Internal Prisma → DTO mappers shared across `lib/queries/*`.
 *
 * Each query module reuses these helpers so the conversion of `Decimal`
 * columns to strings and `DateTime` columns to ISO timestamps is consistent
 * and centrally testable.
 */

import type { Prisma } from "@/generated/prisma/client";

import {
  type ApplicationDTO,
  type MyApplicationDTO,
  type NotificationDTO,
  type ReviewWithScholarshipDTO,
  type ReviewWithUserDTO,
  type ScholarshipCardDTO,
  type UniversityCardDTO,
  type UniversityDTO,
  type UniversityRefDTO,
  type UserRefDTO,
  dateToIso,
  decimalToString,
  nullableDateToIso,
} from "./dto";

/* ----------------------------- University ---------------------------- */

type UniversityRefRow = Prisma.UniversityGetPayload<{
  select: {
    id: true;
    name: true;
    logo: true;
    country: true;
    type: true;
  };
}>;

export function toUniversityRef(u: UniversityRefRow): UniversityRefDTO {
  return {
    id: u.id,
    name: u.name,
    logo: u.logo ?? null,
    country: u.country,
    type: u.type,
  };
}

type UniversityCardRow = Prisma.UniversityGetPayload<{
  select: {
    id: true;
    name: true;
    logo: true;
    country: true;
    city: true;
    worldRank: true;
    type: true;
    isPartner: true;
  };
}>;

export function toUniversityCard(u: UniversityCardRow): UniversityCardDTO {
  return {
    id: u.id,
    name: u.name,
    logo: u.logo ?? null,
    country: u.country,
    city: u.city,
    worldRank: u.worldRank,
    type: u.type,
    isPartner: u.isPartner,
  };
}

type UniversityFullRow = Prisma.UniversityGetPayload<true>;

export function toUniversityDTO(u: UniversityFullRow): UniversityDTO {
  return {
    id: u.id,
    name: u.name,
    logo: u.logo ?? null,
    contactEmail: u.contactEmail,
    website: u.website,
    description: u.description,
    address: u.address,
    country: u.country,
    city: u.city,
    worldRank: u.worldRank,
    type: u.type,
    establishedYear: u.establishedYear,
    isPartner: u.isPartner,
    acceptingApplications: u.acceptingApplications,
    createdAt: dateToIso(u.createdAt),
    updatedAt: dateToIso(u.updatedAt),
  };
}

/* ----------------------------- Scholarship --------------------------- */

type ScholarshipCardRow = Prisma.ScholarshipGetPayload<{
  include: {
    university: {
      select: {
        id: true;
        name: true;
        logo: true;
        country: true;
        type: true;
      };
    };
  };
}>;

export function toScholarshipCard(s: ScholarshipCardRow): ScholarshipCardDTO {
  return {
    id: s.id,
    title: s.title,
    university: toUniversityRef(s.university),
    category: s.category,
    subject: s.subject,
    deadline: dateToIso(s.deadline),
    stipend: decimalToString(s.stipend),
    fees: decimalToString(s.fees),
    location: s.location,
    image: s.image ?? null,
    isApproved: s.isApproved,
    createdAt: dateToIso(s.createdAt),
  };
}

/* -------------------------------- User ------------------------------- */

type UserRefRow = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    image: true;
    profilePicture: true;
    role: true;
  };
}>;

export function toUserRef(u: UserRefRow): UserRefDTO {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image ?? null,
    profilePicture: u.profilePicture ?? null,
    role: u.role,
  };
}

/* ----------------------------- Application --------------------------- */

type ApplicationRow = Prisma.ApplicationGetPayload<{
  include: {
    scholarship: {
      include: {
        university: {
          select: {
            id: true;
            name: true;
            logo: true;
            country: true;
            type: true;
          };
        };
      };
    };
    user: {
      select: {
        id: true;
        name: true;
        email: true;
        image: true;
        profilePicture: true;
        role: true;
      };
    };
  };
}>;

export function toApplicationDTO(a: ApplicationRow): ApplicationDTO {
  return {
    id: a.id,
    userId: a.userId,
    scholarshipId: a.scholarshipId,
    applicantName: a.applicantName,
    phone: a.phone,
    gender: a.gender,
    applyingDegree: a.applyingDegree,
    sscResult: a.sscResult,
    hscResult: a.hscResult,
    subjectCategory: a.subjectCategory,
    village: a.village,
    district: a.district,
    country: a.country,
    status: a.status,
    paymentStatus: a.paymentStatus,
    feedback: a.feedback ?? null,
    createdAt: dateToIso(a.createdAt),
    updatedAt: dateToIso(a.updatedAt),
    scholarship: toScholarshipCard(a.scholarship),
    user: toUserRef(a.user),
  };
}

type MyApplicationRow = Prisma.ApplicationGetPayload<{
  include: {
    scholarship: {
      include: {
        university: {
          select: {
            id: true;
            name: true;
            logo: true;
            country: true;
            type: true;
          };
        };
      };
    };
  };
}>;

export function toMyApplicationDTO(a: MyApplicationRow): MyApplicationDTO {
  return {
    id: a.id,
    scholarshipId: a.scholarshipId,
    status: a.status,
    paymentStatus: a.paymentStatus,
    feedback: a.feedback ?? null,
    createdAt: dateToIso(a.createdAt),
    scholarship: toScholarshipCard(a.scholarship),
  };
}

/* ------------------------------- Review ------------------------------ */

type ReviewWithUserRow = Prisma.ReviewGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
        image: true;
        profilePicture: true;
        role: true;
      };
    };
  };
}>;

export function toReviewWithUser(r: ReviewWithUserRow): ReviewWithUserDTO {
  return {
    id: r.id,
    userId: r.userId,
    scholarshipId: r.scholarshipId,
    ratingPoint: r.ratingPoint,
    comment: r.comment,
    createdAt: dateToIso(r.createdAt),
    user: toUserRef(r.user),
  };
}

type ReviewWithScholarshipRow = Prisma.ReviewGetPayload<{
  include: {
    scholarship: {
      include: {
        university: {
          select: {
            id: true;
            name: true;
            logo: true;
            country: true;
            type: true;
          };
        };
      };
    };
  };
}>;

export function toReviewWithScholarship(
  r: ReviewWithScholarshipRow,
): ReviewWithScholarshipDTO {
  return {
    id: r.id,
    userId: r.userId,
    scholarshipId: r.scholarshipId,
    ratingPoint: r.ratingPoint,
    comment: r.comment,
    createdAt: dateToIso(r.createdAt),
    scholarship: toScholarshipCard(r.scholarship),
  };
}

/* ---------------------------- Notification --------------------------- */

type NotificationRow = Prisma.NotificationGetPayload<true>;

export function toNotificationDTO(n: NotificationRow): NotificationDTO {
  return {
    id: n.id,
    userId: n.userId,
    message: n.message,
    type: n.type,
    isRead: n.isRead,
    relatedEntityId: n.relatedEntityId ?? null,
    createdAt: dateToIso(n.createdAt),
  };
}

/* ------------------------------ Helpers ------------------------------ */

/** Standard `university` include used by every scholarship-bearing query. */
export const universityRefInclude = {
  university: {
    select: {
      id: true,
      name: true,
      logo: true,
      country: true,
      type: true,
    },
  },
} as const satisfies Prisma.ScholarshipInclude;

/** Standard `user` select used for review/application embedding. */
export const userRefSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  profilePicture: true,
  role: true,
} as const satisfies Prisma.UserSelect;

/** Re-export for ease of consumption inside ISO helpers. */
export { dateToIso, decimalToString, nullableDateToIso };
