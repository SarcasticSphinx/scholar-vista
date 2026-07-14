/**
 * UploadThing FileRouter for ScholarVista.
 *
 * Defines three routes:
 *   - profileImage      : any authenticated user, 1 image, ≤ 5 MB.
 *   - scholarshipImage  : any authenticated user, 1 image, ≤ 5 MB.
 *   - universityLogo    : ADMIN/MODERATOR only, 1 image, ≤ 5 MB.
 *
 * Each route's `middleware` resolves the Better Auth session from the
 * incoming request headers and rejects unauthenticated/unauthorized
 * requests with an `UploadThingError` before any presigned URL is issued.
 *
 * Each route's `onUploadComplete` returns `{ url, userId }` so the client
 * can persist the resulting URL on the appropriate entity via a Server
 * Action (which performs the actual `replacement` semantics required by
 * Req 26.6).
 *
 * Validates: Requirements 26.1, 26.2.
 */

import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import type { FileRouterInputConfig } from "@uploadthing/shared";

import { auth } from "@/lib/auth";

const f = createUploadthing();

/**
 * Per-route file constraints (Req 26.1, 26.2): images only, 1 file per
 * upload, ≤ 5 MB. The `maxFileSize` value is enforced server-side by
 * UploadThing's runtime regex (`^(\d+)(\.\d+)?\s*(B|KB|MB|GB|TB)$`),
 * but its TypeScript type alias `FileSize` is narrowed to powers of two
 * (1/2/4/8/16…), so `"5MB"` requires a localized cast through the
 * `FileRouterInputConfig` shape.
 */
const IMAGE_LIMITS = {
  image: { maxFileSize: "5MB", maxFileCount: 1 },
} as unknown as FileRouterInputConfig;

const ADMIN_ROLES = ["ADMIN", "MODERATOR"] as const;

export const ourFileRouter = {
  /**
   * Profile picture upload (Req 26.1: 1 image per user).
   * Any authenticated user may upload their own profile image.
   */
  profileImage: f(IMAGE_LIMITS)
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) throw new UploadThingError("UNAUTHORIZED");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => ({
      url: file.url,
      userId: metadata.userId,
    })),

  /**
   * Scholarship image upload (Req 26.1: 1 image per scholarship).
   * Any authenticated user may upload an image for their submission;
   * ownership of the target scholarship is enforced by the Server
   * Action that subsequently associates the URL with the entity.
   */
  scholarshipImage: f(IMAGE_LIMITS)
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) throw new UploadThingError("UNAUTHORIZED");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => ({
      url: file.url,
      userId: metadata.userId,
    })),

  /**
   * University logo upload (Req 26.1: 1 image per university).
   * Restricted to ADMIN and MODERATOR roles.
   */
  universityLogo: f(IMAGE_LIMITS)
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) throw new UploadThingError("UNAUTHORIZED");
      const role = session.user.role;
      if (
        typeof role !== "string" ||
        !(ADMIN_ROLES as readonly string[]).includes(role)
      ) {
        throw new UploadThingError("FORBIDDEN");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => ({
      url: file.url,
      userId: metadata.userId,
    })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
