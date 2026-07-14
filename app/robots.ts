/**
 * Robots policy (`app/robots.ts`).
 *
 * Implements Next.js's `MetadataRoute.Robots` convention. Next.js serves the
 * returned object as `/robots.txt`.
 *
 * Policy (per Requirement 24.3, the task spec, and design.md "SEO"):
 *   - Allow crawling of all public pages (`/`).
 *   - Disallow authenticated / non-public routes:
 *       `/dashboard`, `/profile`, `/my-*` (covers `/my-applications`,
 *       `/my-bookmarks`, `/my-reviews`, and any future `my-*` route),
 *       `/notifications`, and all API routes (`/api/*`).
 *   - Point crawlers at the dynamic sitemap (`app/sitemap.ts`).
 *
 * The `/my-*` and `/api/*` patterns use a trailing wildcard so every nested
 * path under those prefixes is excluded, matching the disallow list in the
 * task spec.
 *
 * Base URL
 * --------
 * `NEXT_PUBLIC_APP_URL` is read from the validated `env` module (`lib/env.ts`)
 * and normalised to drop any trailing slash. When unset, a relative
 * `/sitemap.xml` is emitted.
 *
 * Validates: Requirements 24.3.
 */

import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

/** Routes that must never be crawled (authenticated / API surface). */
const DISALLOWED_PATHS = [
  "/dashboard",
  "/profile",
  "/my-*",
  "/notifications",
  "/api/*",
] as const;

/** Read and normalize the configured public base URL (no trailing slash). */
function getBaseUrl(): string {
  return (env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const base = getBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...DISALLOWED_PATHS],
    },
    sitemap: base ? `${base}/sitemap.xml` : "/sitemap.xml",
  };
}
