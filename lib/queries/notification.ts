/**
 * Notification queries.
 *
 * Read paths for the bell dropdown (recent + unread count) and the full
 * Notifications page.
 *
 * Validates: Requirements 33.4 (recent ≤ 20 sorted by `createdAt desc`),
 * 33.2 / 33.3 (unread count powering the bell badge), and the dedicated
 * paginated listing.
 */

import { prisma } from "@/lib/prisma";

import {
  type NotificationDTO,
  type PageResult,
  clampPage,
  totalPagesOf,
} from "./dto";
import { toNotificationDTO } from "./_mappers";

const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE_SIZE = 20;

/* -------------------------- listRecentNotifications ------------------ */

/**
 * The most recent notifications for the bell dropdown — sorted by
 * `createdAt desc`, capped at `limit` (default 20). The `(userId, isRead,
 * createdAt)` index serves this query directly.
 *
 * Validates: Requirements 33.4.
 */
export async function listRecentNotifications(
  userId: string,
  limit: number = DEFAULT_LIMIT,
): Promise<NotificationDTO[]> {
  const safeLimit = Math.max(1, Math.floor(limit));
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: safeLimit,
  });
  return rows.map(toNotificationDTO);
}

/* ------------------------------ getUnreadCount ----------------------- */

/**
 * Number of unread notifications for the user. Drives the bell badge
 * (capped to `99+` in the UI per Requirement 33.3).
 *
 * Validates: Requirement 33.2.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

/* ------------------------ listNotificationsByUser -------------------- */

/**
 * Paginated full notifications listing (Notifications page), 20/page,
 * sorted by `createdAt desc`. Last-page clamping per Requirement 5.11.
 */
export async function listNotificationsByUser(
  userId: string,
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<PageResult<NotificationDTO>> {
  const total = await prisma.notification.count({ where: { userId } });
  const totalPages = totalPagesOf(total, pageSize);
  const safePage = clampPage(page, totalPages);

  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  });

  return {
    items: rows.map(toNotificationDTO),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}
