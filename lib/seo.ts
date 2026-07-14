/**
 * SEO metadata helper.
 *
 * Builds a Next.js `Metadata` object from a small input shape, enforcing
 * the platform's SEO conventions:
 *
 *   - `title.length`        ≤ 60   (truncated when longer)
 *   - `description.length`  ≤ 160  (truncated when longer)
 *   - canonical URL          = `NEXT_PUBLIC_APP_URL` + `path`
 *   - Open Graph + Twitter Card tags populated from the same inputs
 *   - `twitter.card`         = `summary_large_image`
 *
 * Validates: Requirements 24.1, 24.6.
 *
 * The helper has no Prisma dependency and accepts plain structurally typed
 * arguments so it can be reused from any server component or route handler.
 */

import type { Metadata } from "next";

/** Hard length limits applied to title/description before serialization. */
export const SEO_LIMITS = {
  TITLE_MAX: 60,
  DESCRIPTION_MAX: 160,
} as const;

/** Default Open Graph / Twitter image used when callers don't supply one. */
export const DEFAULT_OG_IMAGE_PATH = "/og-default.png";

/** Input accepted by {@link buildMetadata}. */
export interface BuildMetadataInput {
  /** Page title. Truncated to {@link SEO_LIMITS.TITLE_MAX} characters. */
  title: string;
  /** Page description. Truncated to {@link SEO_LIMITS.DESCRIPTION_MAX} characters. */
  description: string;
  /** Absolute path beginning with `/` (e.g. `/scholarships/abc`). */
  path: string;
  /**
   * Optional OG/Twitter image URL.
   * - Absolute (`https://…`) URLs are used as-is.
   * - Relative paths are resolved against `NEXT_PUBLIC_APP_URL`.
   * - Falls back to {@link DEFAULT_OG_IMAGE_PATH} when omitted.
   */
  image?: string;
}

/** Truncate `value` to at most `max` characters (no ellipsis added). */
function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

/** Ensure a path starts with exactly one leading slash. */
function normalizePath(path: string): string {
  if (path.length === 0) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

/** Read and normalize the configured public base URL (no trailing slash). */
function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return url.replace(/\/+$/, "");
}

/** Resolve an image input against the base URL. */
function resolveImage(image: string, base: string): string {
  if (/^https?:\/\//i.test(image)) return image;
  const path = image.startsWith("/") ? image : `/${image}`;
  return base ? `${base}${path}` : path;
}

/**
 * Produce a Next.js {@link Metadata} object with title, description,
 * canonical URL, Open Graph, and Twitter Card fields populated.
 *
 * The returned shape is safe to spread into a route's exported `metadata`
 * or returned from `generateMetadata`.
 */
export function buildMetadata({
  title,
  description,
  path,
  image,
}: BuildMetadataInput): Metadata {
  const safeTitle = truncate(title, SEO_LIMITS.TITLE_MAX);
  const safeDescription = truncate(description, SEO_LIMITS.DESCRIPTION_MAX);

  const base = getBaseUrl();
  const canonical = `${base}${normalizePath(path)}`;

  const resolvedImage = resolveImage(image ?? DEFAULT_OG_IMAGE_PATH, base);
  const images = [{ url: resolvedImage }];

  return {
    title: safeTitle,
    description: safeDescription,
    alternates: {
      canonical,
    },
    openGraph: {
      title: safeTitle,
      description: safeDescription,
      url: canonical,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: safeTitle,
      description: safeDescription,
      images: [resolvedImage],
    },
  };
}
