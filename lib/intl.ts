/**
 * Internationalization helpers.
 *
 * Provides Intl-based formatters and a tiny `t(key)` lookup over the default
 * English message catalog. This module intentionally avoids pulling in a
 * runtime i18n framework so we can swap in `next-intl` (or similar) later
 * without breaking call sites.
 *
 * Validates: Requirements 32.1, 32.2, 32.3
 */

import enMessages from "@/messages/en.json";

/** Default locale used when no explicit locale is supplied. */
export const DEFAULT_LOCALE = "en-US" as const;

/**
 * Locales that render right-to-left. Kept as a small static list so we
 * can resolve direction synchronously without external data.
 */
const RTL_LOCALES = ["ar", "he", "fa", "ur"] as const;

type Messages = typeof enMessages;

/**
 * Format a date (or ISO/date string) using `Intl.DateTimeFormat`.
 *
 * Defaults to `"en-US"` when no locale is supplied. Invalid date inputs
 * fall through to the platform's standard `Invalid Date` behaviour rather
 * than throwing, so call sites can render placeholders if they prefer.
 */
export function formatDate(
  date: Date | string,
  locale: string = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions,
): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(value);
}

/**
 * Format a number using `Intl.NumberFormat`. Defaults to `"en-US"`.
 */
export function formatNumber(
  value: number,
  locale: string = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format a currency amount using `Intl.NumberFormat` with `style: "currency"`.
 * Defaults to `USD` and `"en-US"` so call sites only need to pass the amount.
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Resolve a dotted catalog key (e.g. `"nav.home"`) against the active
 * message catalog. Returns the key itself when the path is missing or
 * does not resolve to a string, providing a safe fallback that keeps the
 * UI rendering even when a translation is forgotten.
 */
export function t(key: string): string {
  if (!key) return key;

  const segments = key.split(".");
  let current: unknown = enMessages as Messages;

  for (const segment of segments) {
    if (
      current !== null &&
      typeof current === "object" &&
      segment in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return key;
    }
  }

  return typeof current === "string" ? current : key;
}

/**
 * Return the writing direction for a given locale identifier.
 *
 * Matches BCP-47 style codes ("ar", "ar-SA", "he-IL", ...) by inspecting
 * the primary subtag. Anything not in the RTL list resolves to `"ltr"`.
 */
export function getDirection(locale: string): "ltr" | "rtl" {
  if (!locale) return "ltr";
  const primary = locale.toLowerCase().split(/[-_]/)[0];
  return (RTL_LOCALES as readonly string[]).includes(primary) ? "rtl" : "ltr";
}
