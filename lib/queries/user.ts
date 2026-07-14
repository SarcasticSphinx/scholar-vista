/**
 * User queries.
 *
 * Profile page data (with derived application/bookmark counts), admin user
 * list, and the basic detail lookup. Sensitive auth fields (passwords,
 * tokens) live on `Account` and are never selected here.
 *
 * Validates: Requirements 9.7 (applied + bookmark counts on profile), 16.4
 * (admin user listing), 19.1 (paginated user list with last-page clamping).
 */

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import {
  type AdminUserDTO,
  type PageResult,
  type UserProfileDTO,
  clampPage,
  dateToIso,
  nullableDateToIso,
  totalPagesOf,
} from "./dto";

const DEFAULT_PAGE_SIZE = 10;

/* ------------------------------ getUserProfile ---------------------- */

/**
 * Profile DTO for the authenticated user, including derived counts of
 * applications + bookmarks rendered on the profile page.
 *
 * Validates: Requirements 9.7, 8.3 (counts shown alongside listings).
 */
export async function getUserProfile(
  userId: string,
): Promise<UserProfileDTO | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      profilePicture: true,
      educationalLevel: true,
      major: true,
      country: true,
      city: true,
      dateOfBirth: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { applications: true, bookmarks: true },
      },
    },
  });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image ?? null,
    role: user.role,
    profilePicture: user.profilePicture ?? null,
    educationalLevel: user.educationalLevel ?? null,
    major: user.major ?? null,
    country: user.country ?? null,
    city: user.city ?? null,
    dateOfBirth: nullableDateToIso(user.dateOfBirth),
    createdAt: dateToIso(user.createdAt),
    updatedAt: dateToIso(user.updatedAt),
    counts: {
      applications: user._count.applications,
      bookmarks: user._count.bookmarks,
    },
  };
}

/* --------------------------- listUsersAdmin ------------------------- */

export interface ListUsersAdminInput {
  /** Free-text search applied to name + email. */
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Admin paginated user list. Search ≥ 2 chars matches `name` and `email`
 * case-insensitively. Sort is `createdAt desc` (newest first).
 *
 * Validates: Requirements 16.4, 19.1, 5.11.
 */
export async function listUsersAdmin(
  input: ListUsersAdminInput,
): Promise<PageResult<AdminUserDTO>> {
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const trimmed = input.search?.trim() ?? "";

  const where: Prisma.UserWhereInput =
    trimmed.length >= 2
      ? {
          OR: [
            { name: { contains: trimmed, mode: "insensitive" } },
            { email: { contains: trimmed, mode: "insensitive" } },
          ],
        }
      : {};

  const total = await prisma.user.count({ where });
  const totalPages = totalPagesOf(total, pageSize);
  const safePage = clampPage(input.page ?? 1, totalPages);

  const rows = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      image: true,
      createdAt: true,
    },
  });

  return {
    items: rows.map(
      (u): AdminUserDTO => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        image: u.image ?? null,
        createdAt: dateToIso(u.createdAt),
      }),
    ),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/* ------------------------------ getUserById ------------------------- */

/**
 * Full user record (including ScholarVista profile extensions). Returns
 * `null` when not found so the admin user-detail page can surface a 404.
 */
export async function getUserById(id: string): Promise<UserProfileDTO | null> {
  // Reuse `getUserProfile`'s shape so the admin and user views render
  // against the same DTO. The shape includes the derived counts the admin
  // user-detail screen needs.
  return getUserProfile(id);
}
