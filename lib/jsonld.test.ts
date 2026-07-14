/**
 * Unit tests for the Schema.org JSON-LD generator (`lib/jsonld.ts`).
 *
 * Covers the pure, dependency-free surface of the helper:
 *   - `@context`/`@type` are the Schema.org `Scholarship` constants.
 *   - All Req 24.5 fields are present: name, description, provider
 *     (university name), url, applicationDeadline, offers (price + currency).
 *   - The enriched `provider` object includes the university website + address
 *     when supplied, and omits them otherwise.
 *   - Defaults: currency falls back to `USD`, price falls back to `0`.
 *
 * The dedicated property test for JSON-LD validity lives with task 4.6.
 *
 * Validates: Requirements 24.5.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_CURRENCY,
  scholarshipJsonLd,
  type ScholarshipJsonLdInput,
} from "./jsonld";

const BASE_URL = "https://scholarvista.example";

function baseInput(): ScholarshipJsonLdInput {
  return {
    id: "schol-1",
    title: "Global Excellence Scholarship",
    description: "A merit scholarship for international students.",
    university: {
      name: "Example University",
      url: "https://uni.example",
      country: "United States",
      city: "Boston",
    },
    applicationDeadline: new Date("2025-12-31T00:00:00.000Z"),
    stipend: 25000,
    currency: "EUR",
  };
}

describe("scholarshipJsonLd", () => {
  let prevAppUrl: string | undefined;

  beforeEach(() => {
    prevAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = BASE_URL;
  });

  afterEach(() => {
    if (prevAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = prevAppUrl;
  });

  it("emits the Schema.org Scholarship context and type", () => {
    const payload = scholarshipJsonLd(baseInput());
    expect(payload["@context"]).toBe("https://schema.org");
    expect(payload["@type"]).toBe("Scholarship");
  });

  it("includes every Req 24.5 field", () => {
    const payload = scholarshipJsonLd(baseInput());

    expect(payload.name).toBe("Global Excellence Scholarship");
    expect(payload.description).toBe(
      "A merit scholarship for international students.",
    );
    expect(payload.provider).toMatchObject({
      "@type": "CollegeOrUniversity",
      name: "Example University",
    });
    expect(payload.url).toBe(`${BASE_URL}/scholarships/schol-1`);
    expect(payload.applicationDeadline).toBe("2025-12-31T00:00:00.000Z");
    expect(payload.offers).toEqual({
      "@type": "Offer",
      priceCurrency: "EUR",
      price: 25000,
    });
  });

  it("enriches the provider with website and postal address when supplied", () => {
    const payload = scholarshipJsonLd(baseInput());

    expect(payload.provider.url).toBe("https://uni.example");
    expect(payload.provider.address).toEqual({
      "@type": "PostalAddress",
      addressLocality: "Boston",
      addressCountry: "United States",
    });
  });

  it("omits provider url and address when the university lacks them", () => {
    const payload = scholarshipJsonLd({
      ...baseInput(),
      university: { name: "Bare University" },
    });

    expect(payload.provider.name).toBe("Bare University");
    expect(payload.provider.url).toBeUndefined();
    expect(payload.provider.address).toBeUndefined();
  });

  it("defaults currency to USD and price to 0 when omitted", () => {
    const payload = scholarshipJsonLd({
      id: "schol-2",
      title: "No-stipend award",
      description: "Covers tuition only.",
      university: { name: "Example University" },
      applicationDeadline: "2025-06-30",
    });

    expect(payload.offers.priceCurrency).toBe(DEFAULT_CURRENCY);
    expect(payload.offers.price).toBe(0);
  });

  it("serialises a Date deadline to an ISO 8601 string", () => {
    const payload = scholarshipJsonLd(baseInput());
    expect(() => new Date(payload.applicationDeadline).toISOString()).not.toThrow();
  });

  it("produces a payload that round-trips through JSON.stringify/parse", () => {
    const payload = scholarshipJsonLd(baseInput());
    const roundTripped = JSON.parse(JSON.stringify(payload));
    expect(roundTripped).toEqual(payload);
  });
});
