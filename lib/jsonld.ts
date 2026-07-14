/**
 * Schema.org JSON-LD generators for SEO-rich server-rendered pages.
 *
 * `scholarshipJsonLd` produces a Schema.org `Scholarship` payload
 * suitable for embedding inside a `<script type="application/ld+json">`
 * tag on the scholarship detail page.
 *
 * Validates: Requirements 24.5.
 *
 * The helpers accept plain structurally typed objects so they have no
 * Prisma dependency and can be exercised from unit tests with arbitrary
 * inputs.
 */

/** Default ISO 4217 currency used when a scholarship omits one. */
export const DEFAULT_CURRENCY = "USD";

/** University shape used to populate the `provider` field. */
export interface ScholarshipProviderInput {
  /** University name — emitted as `provider.name` (required by Req 24.5). */
  name: string;
  /** Optional public website — emitted as `provider.url` when present. */
  url?: string | null;
  /** Optional country — emitted inside `provider.address` when present. */
  country?: string | null;
  /** Optional city — emitted inside `provider.address` when present. */
  city?: string | null;
}

/**
 * Structural shape accepted by {@link scholarshipJsonLd}.
 *
 * Fields are kept narrow on purpose — callers pass only what the JSON-LD
 * payload needs, never the full Prisma model.
 */
export interface ScholarshipJsonLdInput {
  /** Scholarship identifier used to build the canonical URL. */
  id: string;
  /** Scholarship title — emitted as Schema.org `name`. */
  title: string;
  /** Scholarship description. */
  description: string;
  /** University offering the scholarship; emitted as `provider.name`. */
  university?: ScholarshipProviderInput | null;
  /** Application deadline (Date or ISO string). */
  applicationDeadline: Date | string;
  /** Optional stipend amount; defaults to `0` when missing. */
  stipend?: number | null;
  /** Optional ISO 4217 currency code (e.g. `USD`); defaults to `DEFAULT_CURRENCY`. */
  currency?: string | null;
}

/** Schema.org `Scholarship` JSON-LD payload returned by {@link scholarshipJsonLd}. */
export interface ScholarshipJsonLd {
  "@context": "https://schema.org";
  "@type": "Scholarship";
  name: string;
  description: string;
  provider: {
    "@type": "CollegeOrUniversity";
    name: string;
    /** University website, included when supplied. */
    url?: string;
    /** Postal address, included when a city/country is supplied. */
    address?: {
      "@type": "PostalAddress";
      addressLocality?: string;
      addressCountry?: string;
    };
  };
  url: string;
  applicationDeadline: string;
  offers: {
    "@type": "Offer";
    priceCurrency: string;
    price: number;
  };
}

/** Read and normalize the configured public base URL (no trailing slash). */
function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return url.replace(/\/+$/, "");
}

/** Coerce a Date/string deadline to an ISO 8601 string. */
function toIsoString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  // Fall through: treat string inputs as already-formatted dates. If the
  // string happens to be a valid date but in another format, callers can
  // normalize on their side.
  return value;
}

/**
 * Build a Schema.org `Scholarship` JSON-LD payload for a scholarship.
 *
 * The returned object can be JSON-stringified and embedded inside a
 * `<script type="application/ld+json">` tag.
 */
export function scholarshipJsonLd(
  scholarship: ScholarshipJsonLdInput,
): ScholarshipJsonLd {
  const base = getBaseUrl();
  const url = `${base}/scholarships/${scholarship.id}`;

  const provider: ScholarshipJsonLd["provider"] = {
    "@type": "CollegeOrUniversity",
    name: scholarship.university?.name ?? "",
  };

  // Enrich the provider with the university's website + address when the
  // caller supplies them (Req 24.5 requires the university name; the extra
  // fields strengthen the Schema.org `provider` entity for richer results).
  const providerUrl = scholarship.university?.url?.trim();
  if (providerUrl) provider.url = providerUrl;

  const addressLocality = scholarship.university?.city?.trim();
  const addressCountry = scholarship.university?.country?.trim();
  if (addressLocality || addressCountry) {
    provider.address = {
      "@type": "PostalAddress",
      ...(addressLocality ? { addressLocality } : {}),
      ...(addressCountry ? { addressCountry } : {}),
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "Scholarship",
    name: scholarship.title,
    description: scholarship.description,
    provider,
    url,
    applicationDeadline: toIsoString(scholarship.applicationDeadline),
    offers: {
      "@type": "Offer",
      priceCurrency: scholarship.currency ?? DEFAULT_CURRENCY,
      price: scholarship.stipend ?? 0,
    },
  };
}
