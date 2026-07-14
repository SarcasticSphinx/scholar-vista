"use server";

/**
 * Notification Server Actions.
 *
 * - `markAsRead(notificationId)` — flips `isRead = true`, but only when the
 *   notification belongs to the authenticated user (Req 33).
 * - `markAllAsRead()` — bulk-marks the user's unread notifications.
 * - `getRecentNotificationsAction()` — wraps the read query so client
 *   components that can't import server-only modules (e.g. the bell
 *   dropdown) can still pull the latest 20 via a Server Action.
 *
 * Validates: Requirements 33.1, 33.2, 33.4.
 */

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { listRecentNotifications } from "@/lib/queries/notification";
import { type NotificationDTO } from "@/lib/queries/dto";
import { requireSession } from "@/lib/rbac";
import {
  fail,
  ok,
  prismaErrorToActionResult,
} from "@/lib/action-result";
import type { ActionResult } from "@/types/api";

/* ------------------------------------------------------------------ */
/*                               markAsRead                            */
/* ------------------------------------------------------------------ */

/**
 * Mark a single notification as read. Returns `NOT_FOUND` if the row
 * doesn't exist or doesn't belong to the caller — we never reveal whether
 * a notification id exists for another user.
 */
export async function markAsRead(
  notificationId: string,
): Promise<ActionResult<{ id: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail<{ id: string }>("UNAUTHORIZED", "Authentication required.");
  }

  if (!notificationId) {
    return fail<{ id: string }>("VALIDATION", "Notification id is required.");
  }

  try {
    // Use `updateMany` so the (id, userId) ownership filter is enforced in
    // a single round trip; if zero rows match, the notification either
    // doesn't exist or belongs to someone else.
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId: session.user.id },
      data: { isRead: true },
    });

    if (result.count === 0) {
      return fail<{ id: string }>("NOT_FOUND", "Notification not found.");
    }

    revalidatePath("/notifications");
    return ok({ id: notificationId });
  } catch (error) {
    return prismaErrorToActionResult<{ id: string }>(error);
  }
}

/* ------------------------------------------------------------------ */
/*                             markAllAsRead                           */
/* ------------------------------------------------------------------ */

export async function markAllAsRead(): Promise<ActionResult<{ updated: number }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail<{ updated: number }>(
      "UNAUTHORIZED",
      "Authentication required.",
    );
  }

  try {
    const result = await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    });

    revalidatePath("/notifications");
    return ok({ updated: result.count });
  } catch (error) {
    return prismaErrorToActionResult<{ updated: number }>(error);
  }
}

/* ------------------------------------------------------------------ */
/*                       getRecentNotificationsAction                  */
/* ------------------------------------------------------------------ */

/**
 * Server Action wrapper around `listRecentNotifications` so the bell
 * dropdown (a client component) can pull the latest notifications without
 * an API route. Returns the DTO list directly inside the `ActionResult`
 * envelope.
 */
export async function getRecentNotificationsAction(): Promise<
  ActionResult<NotificationDTO[]>
> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail<NotificationDTO[]>(
      "UNAUTHORIZED",
      "Authentication required.",
    );
  }

  try {
    const items = await listRecentNotifications(session.user.id);
    return ok(items);
  } catch (error) {
    return prismaErrorToActionResult<NotificationDTO[]>(error);
  }
}
