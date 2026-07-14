# Implementation Plan: ScholarVista Next.js

## Overview

This plan converts the ScholarVista design and requirements into an incremental, testable build sequence. Work begins by bootstrapping the `next-js-boilerplate-with-better-auth` template into the `scholar_vista` workspace, renaming all `HomeX`/`homex-crm` references to `ScholarVista`/`scholar-vista`, and locking in tooling. Foundations (Prisma schema, Better Auth, validation schemas, cache, RBAC, layouts, theme, middleware, UploadThing) come next, followed by public catalog pages, authenticated user features, the multi-step application + payment flow, notifications, the admin dashboard suite, SEO infrastructure (sitemap/robots/JSON-LD), and global error handling. Property-based tests for the 34 correctness properties are placed near the code they validate. Each step builds on the previous and ends with explicit wiring; checkpoint tasks separate major milestones.

All implementation uses **TypeScript** with the Next.js App Router, Tailwind CSS, shadcn/ui, Prisma, Better Auth, UploadThing, React Hook Form + Zod, Sonner, next-themes, Recharts, Vitest, `@fast-check/vitest`, React Testing Library, Playwright, and `@axe-core/playwright`, as specified in the design document.

## Tasks

- [ ] 1. Initialize project from boilerplate and rename
  - [x] 1.1 Clone `next-js-boilerplate-with-better-auth` into the `scholar_vista` workspace root and remove the boilerplate `.git` history
    - Place app, components, lib, hooks, types, prisma, public, and config files at the workspace root (alongside `.kiro/`)
    - Initialize a fresh Git repository and commit the unmodified boilerplate
    - _Requirements: 1.1, 1.2, 1.8_

  - [x] 1.2 Rename all `HomeX`/`homex-crm` references to `ScholarVista`/`scholar-vista`
    - Update `package.json` `name` to `scholar-vista`
    - Update README title, root layout `<title>`/metadata, page titles, navbar/footer brand strings, manifest fields, env keys with the `HOMEX_` prefix, and any seed/fixture strings
    - Run a project-wide search for `homex` (case-insensitive) and `HomeX` to confirm no occurrences remain outside `.kiro/`
    - _Requirements: 1.1_

  - [x] 1.3 Pin and install the latest stable versions of all required dependencies
    - Verify or upgrade: `next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `@radix-ui/*` (via shadcn/ui), `prisma`, `@prisma/client`, `better-auth`, `uploadthing`, `@uploadthing/react`, `react-hook-form`, `zod`, `@hookform/resolvers`, `sonner`, `next-themes`, `recharts`, `lucide-react`
    - Add dev dependencies: `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `fast-check`, `@fast-check/vitest`, `@playwright/test`, `@axe-core/playwright`, `eslint`, `@types/node`, `@types/react`
    - Confirm `npm install` (or `pnpm install`) completes with no peer-dependency conflicts
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.13_

  - [x] 1.4 Configure environment variables and `.env.example`
    - Create `.env.example` listing `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `UPLOADTHING_TOKEN`, `UPLOADTHING_SECRET`, and payment-provider keys (with empty values)
    - Create a local `.env` with development values
    - Add `lib/env.ts` to validate required env vars at startup using Zod
    - _Requirements: 1.10, 1.11_

  - [x] 1.5 Verify lint, type-check, and build pass on the renamed boilerplate
    - Run `npm run lint`, `tsc --noEmit`, and `next build`
    - Fix any errors introduced by the rename
    - Add `lint`, `typecheck`, `test`, `test:integration`, `test:e2e`, and `db:migrate` npm scripts to `package.json`
    - _Requirements: 1.9, 1.12_

- [ ] 2. Implement Prisma schema, migrations, and database client
  - [x] 2.1 Replace `prisma/schema.prisma` with the ScholarVista schema
    - Define enums (`UserRole`, `ScholarshipCategory`, `UniversityType`, `Gender`, `ApplyingDegree`, `ApplicationStatus`, `PaymentStatus`, `NotificationType`)
    - Extend `User` with `role`, `profilePicture`, `educationalLevel`, `major`, `country`, `city`, `dateOfBirth`
    - Add `University`, `Scholarship`, `Application`, `Review`, `Payment`, `Notification`, `Bookmark`, `PlatformSettings` models with the field types, lengths, decimals, defaults, indexes, unique constraints, and cascade rules from the design
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_

  - [x] 2.2 Generate the initial Prisma migration and add raw-SQL CHECK constraints
    - Run `prisma migrate dev --name init` against a NeonDB development branch
    - Add a follow-up migration containing raw SQL CHECK constraints: `Review.ratingPoint BETWEEN 1 AND 5`, `University.worldRank BETWEEN 1 AND 30000`, `University.establishedYear BETWEEN 1000 AND EXTRACT(YEAR FROM NOW())`
    - _Requirements: 2.3, 2.4, 2.6, 10.1_

  - [x] 2.3 Implement the Prisma client singleton
    - Create `lib/prisma.ts` exporting a global singleton in dev and a fresh client in prod
    - Configure pooled NeonDB `DATABASE_URL` and graceful disconnect for serverless
    - _Requirements: 1.4, 28.5_

  - [x] 2.4 Create deterministic seed data
    - Add `prisma/seed.ts` seeding 1 ADMIN, 1 MODERATOR, 3 USER accounts, 5 universities (1 partner), 12 approved scholarships across categories, plus sample applications, reviews, bookmarks, notifications
    - Wire the `prisma.seed` script in `package.json`
    - _Requirements: 4.3, 4.5, 16.4_

  - [ ] 2.5* Write integration test for cascade deletion
    - **Property 4: Cascade deletion**
    - **Validates: Requirements 2.11, 17.5, 18.5**
    - Use `@fast-check/vitest` with a transactional fixture; assert deleting a User removes Applications/Reviews/Bookmarks/Payments/Notifications, deleting a Scholarship removes Reviews/Bookmarks/Applications/Payments, deleting a University removes its Scholarships transitively
    - _Requirements: 2.11, 17.5, 18.5_

  - [ ] 2.6* Write integration test for unique-constraint duplicate rejection
    - **Property 3: Database unique-constraint duplicate rejection**
    - **Validates: Requirements 2.9, 2.10, 7.6, 10.3**
    - Generate `(userId, scholarshipId)` pairs with fast-check; assert the second insert into `Application`, `Review`, and `Bookmark` throws `P2002` and DB state is unchanged
    - _Requirements: 2.9, 2.10, 7.6, 10.3_

- [ ] 3. Configure Better Auth and authentication endpoints
  - [x] 3.1 Create `lib/auth.ts` Better Auth server instance
    - Configure `prismaAdapter`, `emailAndPassword` (8–128 char password), Google `socialProviders`, `nextCookies()` plugin, and `additionalFields` for the User extensions
    - Export the inferred `Session` type
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 3.2 Create the Better Auth route handler
    - Add `app/api/auth/[...all]/route.ts` exporting `GET`/`POST` via `toNextJsHandler(auth)`
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 3.3 Create the Better Auth client SDK
    - Add `lib/auth-client.ts` exporting `signIn`, `signOut`, `signUp`, `useSession` configured with `NEXT_PUBLIC_APP_URL`
    - _Requirements: 3.1, 3.2_

  - [x] 3.4 Implement RBAC helpers
    - Add `lib/rbac.ts` exporting `requireSession()` and `requireRole(roles)` that read the session via `auth.api.getSession({ headers })` and throw typed `UNAUTHORIZED`/`FORBIDDEN` errors
    - _Requirements: 3.6, 3.7, 3.9, 3.11_

  - [x] 3.5 Augment session/user types
    - Add `types/auth.ts` declaring the augmented `Session`/`User` types including the `role` and ScholarVista profile fields
    - _Requirements: 2.1, 3.7_

- [ ] 4. Build core libraries: validation, cache, SEO, intl, errors
  - [x] 4.1 Create Zod validation schemas in `lib/validation/`
    - `scholarship.ts`, `application.ts`, `university.ts`, `user.ts` (profile + auth), `review.ts`, `settings.ts`, `image.ts`, `bookmark.ts`
    - Encode every length, range, enum, regex, URL, and future-date constraint from the design
    - Export inferred input/output types
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.10, 7.3, 9.5, 10.1, 11.3, 11.4, 17.2, 18.2, 20.5, 26.2, 34.2_

  - [ ] 4.2* Write property test for Zod schema validation conformance
    - **Property 1: Zod schema validation conformance**
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.10, 7.3, 9.5, 10.1, 11.3, 11.4, 17.2, 18.2, 20.5, 26.2, 34.2**
    - For each schema, generate inputs with fast-check arbitraries that mirror constraint bounds; assert `safeParse` accepts iff every field is in-bounds
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 7.3, 9.5, 10.1, 11.3, 11.4, 17.2, 18.2, 20.5, 26.2, 34.2_

  - [x] 4.3 Create cache helpers and tag registry
    - Add `lib/cache.ts` exporting `CACHE_TAGS`, `REVALIDATE`, and a `cached(fn, key, opts)` wrapper around `unstable_cache`
    - _Requirements: 25.5_

  - [x] 4.4 Create SEO metadata helper and JSON-LD utilities
    - Add `lib/seo.ts` exporting `buildMetadata({ title, description, path, image })` enforcing 60/160 char limits, OG, Twitter, and canonical tags
    - Add `lib/jsonld.ts` exporting `scholarshipJsonLd(scholarship)` returning a Schema.org `Scholarship` payload
    - _Requirements: 24.1, 24.5, 24.6_

  - [ ] 4.5* Write property test for SEO metadata length limits
    - **Property 23: SEO metadata length limits**
    - **Validates: Requirements 24.1, 24.6**
    - Generate `(title, description, path, image)` inputs and assert produced metadata enforces title ≤ 60, description ≤ 160, and contains required OG/Twitter/canonical fields
    - _Requirements: 24.1, 24.6_

  - [ ] 4.6* Write property test for JSON-LD validity
    - **Property 24: JSON-LD validity for scholarship pages**
    - **Validates: Requirements 24.5**
    - Generate scholarship arbitraries and assert the JSON-LD parses, has `@type = "Scholarship"`, and contains `name`, `description`, `provider`, `url`, `applicationDeadline`, and `offers`
    - _Requirements: 24.5_

  - [x] 4.7 Implement intl helpers and locale config
    - Add `lib/intl.ts` exporting `formatDate(d, locale?)`, `formatNumber(n, locale?)`, `formatCurrency(amount, currency, locale?)`, and `t(key)` reading from `messages/en.json`
    - Create `messages/en.json` with the initial English string catalog (navigation labels, common buttons, error messages)
    - _Requirements: 32.1, 32.2, 32.3_

  - [ ] 4.8* Write property test for intl formatting parity
    - **Property 31: Intl formatting parity**
    - **Validates: Requirements 32.2**
    - Generate dates, numbers, and locale strings; assert `formatDate`/`formatNumber` match `Intl.DateTimeFormat`/`Intl.NumberFormat` outputs and default to `en-US`
    - _Requirements: 32.2_

  - [x] 4.9 Define the `ActionResult` discriminated union and error codes
    - Add `types/api.ts` exporting `ActionResult<T>` and the `ErrorCode` union (`VALIDATION`, `UNAUTHORIZED`, `FORBIDDEN`, `FORBIDDEN_SELF_CHANGE`, `NOT_FOUND`, `DUPLICATE`, `INVALID_REFERENCE`, `INVALID_TRANSITION`, `PAYMENT_REQUIRED`, `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, `FEATURE_DISABLED`, `DATABASE_UNAVAILABLE`, `UPLOAD_FAILED`, `INTERNAL`)
    - Add a `lib/action-result.ts` helper with `ok(data)`, `fail(code, message, fieldErrors?)`, and a Prisma-error-to-`ActionResult` mapper
    - _Requirements: 28.2, 28.3, 28.5_

- [ ] 5. Configure middleware, layouts, theme, and providers
  - [x] 5.1 Implement edge middleware route gating
    - Add `middleware.ts` matching the protected path patterns from the design (`/profile`, `/change-password`, `/my-*`, `/notifications`, `/scholarships/*/apply`, `/scholarships/new`, `/dashboard`)
    - Use `getSessionCookie(req)`; redirect unauthenticated requests to `/sign-in?returnUrl=...`
    - Configure `matcher` to skip `_next/`, `api/auth`, and `favicon`
    - _Requirements: 3.6, 3.9, 3.11, 8.5_

  - [x] 5.2 Build the root layout, theme provider, and global styles
    - Update `app/layout.tsx` with `<html lang="en" suppressHydrationWarning>`, `next-themes` `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`), Sonner `<Toaster>`, and `dir` resolved from locale config
    - Update `app/globals.css` with Tailwind layers and CSS variables for light/dark with WCAG AA contrast values
    - Configure `tailwind.config.ts` with `darkMode: "class"`, content globs, and theme tokens
    - _Requirements: 22.1, 22.4, 22.5, 22.6, 27.4, 32.3_

  - [x] 5.3 Create layout group shells
    - Add `app/(public)/layout.tsx` (Navbar + Footer), `app/(auth)/layout.tsx` (centered card), `app/(authenticated)/layout.tsx` (Navbar + protected wrapper that calls `requireSession`), `app/(dashboard)/layout.tsx` (Sidebar + Topbar that calls `requireRole(['ADMIN','MODERATOR'])` and `redirect('/')` on failure)
    - _Requirements: 3.7, 3.11, 16.5, 23.5_

  - [x] 5.4 Build the Navbar, Footer, Sidebar, and ThemeToggle
    - `components/layout/navbar.tsx` (server) with mobile menu state delegated to a small client component
    - `components/layout/footer.tsx` (server)
    - `components/layout/sidebar.tsx` (server, dashboard) with collapsed-by-default behavior below `lg`
    - `components/layout/theme-toggle.tsx` (client) using `useTheme()` from next-themes
    - Apply skip-to-main-content link as the first focusable element in the public/auth/authenticated layouts
    - _Requirements: 22.1, 22.2, 23.2, 23.5, 23.7, 27.2_

  - [ ] 5.5* Write property test for theme persistence and default
    - **Property 22: Theme persistence and default**
    - **Validates: Requirements 22.2, 22.4**
    - Using a jsdom Vitest environment, exercise `setTheme(T)` for each `T ∈ {light, dark, system}`; assert reading the stored preference returns `T` and the resolved default is `system` when no preference is stored
    - _Requirements: 22.2, 22.4_

  - [ ] 5.6* Write property test for the authorization access matrix
    - **Property 2: Authorization access matrix**
    - **Validates: Requirements 3.6, 3.7, 3.9, 3.11, 6.5, 8.5, 16.5, 34.1**
    - Generate `(role, route, method)` triples and assert middleware + `requireRole` produce the redirect/allow/deny response declared by the access matrix
    - _Requirements: 3.6, 3.7, 3.9, 3.11, 6.5, 8.5, 16.5, 34.1_

- [ ] 6. Configure UploadThing and image upload flow
  - [x] 6.1 Define the UploadThing FileRouter
    - Add `app/api/uploadthing/core.ts` with `profileImage`, `scholarshipImage`, `universityLogo` routes; each enforces session via `auth.api.getSession`, restricts `universityLogo` to ADMIN/MODERATOR, returns `{ url, userId }` from `onUploadComplete`
    - _Requirements: 26.1, 26.2_

  - [x] 6.2 Add the UploadThing route handler and React helpers
    - Add `app/api/uploadthing/route.ts` calling `createRouteHandler(ourFileRouter)`
    - Add `lib/uploadthing.ts` exporting typed `UploadButton` and `UploadDropzone` helpers via `generateReactHelpers`
    - Whitelist the UploadThing CDN host in `next.config.ts` `images.remotePatterns`
    - _Requirements: 26.1, 26.5_

  - [x] 6.3 Implement client-side image validator
    - Add `lib/image-validator.ts` exporting `validateImage(file)` returning `ok` iff `mime ∈ {image/jpeg, image/png, image/webp} ∧ size ≤ 5 MB`, otherwise an error identifying the failed rule
    - Wire it into the React upload helpers to reject before upload starts
    - _Requirements: 26.2, 26.3, 26.4_

  - [ ] 6.4* Write property test for image upload validator
    - **Property 26: Image upload validator**
    - **Validates: Requirements 26.2, 26.3**
    - Generate `(mime, size)` arbitraries and assert `validateImage` returns `ok` iff allowed mime AND size ≤ 5 MB
    - _Requirements: 26.2, 26.3_

  - [ ] 6.5* Write property test for image replacement
    - **Property 27: Image replacement**
    - **Validates: Requirements 26.6**
    - For User/Scholarship/University arbitraries with existing image URL `u_old`, run the update Server Action with new URL `u_new` and assert the entity's image equals `u_new`
    - _Requirements: 26.6_

- [ ] 7. Implement query layer and Server Actions skeleton
  - [x] 7.1 Implement `lib/queries/scholarship.ts`
    - `listScholarships({ filters, sort, page, pageSize })` with case-insensitive search on title/university/subject, category/location/funding/deadline-window filters, sort by `deadline asc`/`avgRating desc`/`createdAt desc`, last-page clamping
    - `getScholarshipById`, `relatedScholarships(s, limit=6)`, `featuredScholarships(limit=6)`, `pendingScholarships`, `scholarshipsByUniversity`
    - Wrap with `unstable_cache` and tags where appropriate
    - _Requirements: 4.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8, 5.11, 6.7, 14.2, 17.1, 21.1_

  - [x] 7.2 Implement `lib/queries/university.ts`
    - `listUniversities({ search, page, pageSize })` and `partnerUniversities(limit=6)`, `getUniversityById`
    - _Requirements: 4.5, 13.1, 13.4, 18.1_

  - [x] 7.3 Implement `lib/queries/application.ts`, `bookmark.ts`, `review.ts`, `notification.ts`, `user.ts`, `stats.ts`
    - Listings, detail lookups, average-rating computation, dashboard counts, application-trend buckets, partner counts, profile counts
    - _Requirements: 4.4, 8.3, 9.7, 10.2, 10.5, 12.1, 16.2, 16.3, 16.4, 19.1, 20.1_

  - [ ] 7.4* Write property test for paginated and sorted listing
    - **Property 5: Paginated and sorted listing**
    - **Validates: Requirements 5.1, 5.8, 5.11, 6.3, 8.3, 10.2, 12.1, 13.1, 14.2, 17.1, 18.1, 19.1, 20.1, 21.1**
    - Generate dataset + `(page, pageSize, sort)` arbitraries; assert returned slice length ≤ pageSize, sort order respected, equals `items.slice((page-1)*pageSize, page*pageSize)`, and last-page clamping holds
    - _Requirements: 5.1, 5.8, 5.11, 6.3, 8.3, 10.2, 12.1, 13.1, 14.2, 17.1, 18.1, 19.1, 20.1, 21.1_

  - [ ] 7.5* Write property test for search and filter predicate conformance
    - **Property 6: Search and filter predicate conformance**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6, 13.4, 20.6**
    - For each listing, generate database state and filter F arbitraries; assert every returned item satisfies F (search ≥ 2 chars matches title/university/subject case-insensitively, categorical filters, deadline windows)
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 13.4, 20.6_

  - [x] 7.6 Implement `actions/` Server Action skeleton
    - Create `actions/scholarship.ts`, `application.ts`, `bookmark.ts`, `review.ts`, `university.ts`, `user.ts`, `notification.ts`, `settings.ts`, `payment.ts`
    - Each action begins with `requireSession`/`requireRole`, Zod `safeParse`, and returns `ActionResult`
    - Wire `revalidateTag`/`revalidatePath` after writes
    - _Requirements: 3.7, 7.4, 8.1, 9.2, 10.1, 11.2, 17.2, 17.6, 18.2, 19.4, 20.3, 33.1, 34.4_

- [ ] 8. Build public catalog pages
  - [x] 8.1 Build the home page
    - `app/(public)/page.tsx` (server) renders hero with search input + CTA, featured scholarships (≤6, approved, sorted by `createdAt desc`), platform stats, partner universities (≤6), all using `lib/queries/stats.ts`/`scholarship.ts`/`university.ts`
    - Add `app/(public)/loading.tsx` with shaped skeletons
    - Add `app/(public)/error.tsx` rendering retry UI when DB load fails
    - Apply `buildMetadata` for title, description, OG
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 8.2 Build scholarship card and shared list components
    - `components/scholarship/scholarship-card.tsx` (server) showing title, university, category, deadline, stipend, location with a bookmark island and compare island
    - `components/shared/empty-state.tsx`, `components/shared/pagination.tsx`, `components/shared/skeletons.tsx`
    - _Requirements: 4.6, 5.9, 25.2_

  - [x] 8.3 Build the scholarship browse page with filters
    - `app/(public)/scholarships/page.tsx` accepting search params (`q`, `category`, `country`, `funding`, `deadline`, `sort`, `page`)
    - `components/scholarship/filter-bar.tsx` (client) syncing filters to URL via `router.replace`
    - `components/scholarship/sort-select.tsx` (client) with default `createdAt desc`
    - 12 cards/page; show empty-state when no matches
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_

  - [ ] 8.4* Write property test for URL filter round-trip
    - **Property 7: URL filter round-trip**
    - **Validates: Requirements 5.7, 13.5**
    - Generate filter objects and assert `parseFilters(encodeFilters(F)) === F`
    - _Requirements: 5.7, 13.5_

  - [ ] 8.5* Write property test for featured and partner listings
    - **Property 17: Featured and partner listings**
    - **Validates: Requirements 4.3, 4.5**
    - Generate database states and assert `featuredScholarships` returns `min(6, count(approved))` items, all approved, sorted by `createdAt desc`; `partnerUniversities` returns `min(6, count(partner))`, all `isPartner=true`
    - _Requirements: 4.3, 4.5_

  - [x] 8.6 Build the scholarship detail page
    - `app/(public)/scholarships/[id]/page.tsx` with `generateMetadata`, JSON-LD `<script>`, all detail fields, related scholarships, reviews list (≤10), Apply Now (auth-aware), bookmark toggle (auth-aware), expired-deadline indicator
    - Return `notFound()` when scholarship missing or `isApproved=false` (unless user is owner/admin)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 24.5_

  - [ ] 8.7* Write property test for related-scholarships predicate
    - **Property 15: Related-scholarships predicate**
    - **Validates: Requirements 6.7**
    - Generate scholarship + DB state arbitraries; assert `related(S)` size ≤ 6, excludes S, and every element satisfies `category=S.category ∨ universityId=S.universityId`
    - _Requirements: 6.7_

  - [ ] 8.8* Write property test for deadline expiry gating
    - **Property 16: Deadline expiry gating**
    - **Validates: Requirements 6.8**
    - Generate `(deadline, now)` arbitraries and assert the detail page indicates expired and disables Apply iff `deadline < now`
    - _Requirements: 6.8_

  - [ ] 8.9* Write property test for displayed counts
    - **Property 18: Displayed counts equal recomputed counts**
    - **Validates: Requirements 4.4, 9.7, 16.2**
    - Seed DB states and assert home stats, dashboard summaries, and profile counts match independent count queries
    - _Requirements: 4.4, 9.7, 16.2_

  - [x] 8.10 Build the universities list and detail pages
    - `app/(public)/universities/page.tsx` paginated 12/page, search by name/country
    - `app/(public)/universities/[id]/page.tsx` with full detail and ≤10 scholarships per page sorted by `deadline asc`
    - Add `generateMetadata` and `notFound()` handling
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 14.1, 14.2, 14.3, 14.4_

- [ ] 9. Build comparison feature
  - [x] 9.1 Implement the comparison cart hook
    - `hooks/use-comparison.ts` (client) backed by `localStorage` key `sv:compare:v1`, exposing `{ items, add, remove, clear, isFull }` with min 2 / max 3 invariants and dedup
    - `components/scholarship/compare-button.tsx`, `components/scholarship/comparison-tray.tsx` (floating, shown when count ≥ 2)
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 9.2 Build the comparison page
    - `app/(public)/compare/page.tsx` (client) hydrates from localStorage, fetches missing scholarships via a Server Action returning `Promise<ScholarshipDTO[]>`, renders side-by-side table with title, university, stipend, coverage, deadline, category, requirements, rating; missing values render `"-"`
    - _Requirements: 15.6, 15.7_

  - [ ] 9.3* Write property test for comparison cart invariants
    - **Property 13: Comparison cart invariants**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5**
    - Generate sequences of `add`/`remove`/`clear` and assert size ≤ 3, no duplicates, localStorage round-trip identity, and Compare-button visibility iff `|cart| ≥ 2`
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ] 9.4* Write property test for comparison render attributes
    - **Property 14: Comparison render contains required attributes**
    - **Validates: Requirements 15.6, 15.7**
    - Generate `2 ≤ |C| ≤ 3` scholarship sets with optional null fields; assert RTL render contains a row for every required attribute and renders `"-"` for null/undefined values
    - _Requirements: 15.6, 15.7_

- [ ] 10. Build static informational pages
  - [x] 10.1 Implement the Scholarship Guide page
    - `app/(public)/guide/page.tsx` (server) with sections (search, apply, track, tips) using anchor IDs and semantic headings; server-rendered with `buildMetadata`
    - _Requirements: 24.4, 29.1, 29.4, 29.5_

  - [x] 10.2 Implement the Help page
    - `app/(public)/help/page.tsx` (server) with ≥5 FAQ entries (account, applications, bookmarks, reviews, payments) and platform usage instructions; `buildMetadata` applied
    - _Requirements: 29.2, 29.4, 29.5_

- [ ] 11. Build authentication pages
  - [x] 11.1 Build sign-in, sign-up, and change-password pages
    - `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx`, `app/(auth)/change-password/page.tsx` (client forms via RHF + Zod)
    - Include Google OAuth button on sign-in/sign-up using `authClient.signIn.social({ provider: 'google' })`
    - Honor `returnUrl` search param after successful sign-in
    - Display generic error messages on failure (do not reveal whether an email is registered)
    - _Requirements: 3.1, 3.2, 3.4, 3.8, 3.10_

  - [x] 11.2 Build user menu with sign-out
    - `components/layout/user-menu.tsx` (client) using `useSession` and `signOut`; redirect to `/` after sign-out
    - _Requirements: 3.8_

- [ ] 12. Checkpoint - foundation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Build authenticated user features
  - [x] 13.1 Build the profile page
    - `app/(authenticated)/profile/page.tsx` showing name, email (read-only), profile picture (UploadThing `UploadButton`), educational level, major, country, city, date-of-birth
    - `components/forms/profile-form.tsx` (client, RHF + Zod) calling `updateProfileAction`
    - Show applied scholarships count and bookmarks count
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 26.1_

  - [x] 13.2 Build the My Bookmarks page and bookmark Server Action
    - `app/(authenticated)/my-bookmarks/page.tsx` paginated 12/page
    - `actions/bookmark.ts#toggleBookmark(scholarshipId)` upserts/deletes the row, calls `revalidateTag(scholarshipDetail(id))`, returns the new state within 1 second
    - `components/scholarship/bookmark-button.tsx` (client) updates icon optimistically; redirects to `/sign-in?returnUrl=...` when unauthenticated
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 13.3* Write property test for bookmark toggle is its own inverse
    - **Property 8: Bookmark toggle is its own inverse**
    - **Validates: Requirements 8.1, 8.2, 8.4**
    - Generate `(user, scholarship, initialState)` arbitraries; assert applying toggle twice returns DB to initial state and once flips it
    - _Requirements: 8.1, 8.2, 8.4_

  - [x] 13.4 Build the My Reviews page and review Server Action
    - `app/(authenticated)/my-reviews/page.tsx` listing user's reviews
    - `components/forms/review-form.tsx` (client, RHF + Zod 1–5 rating, 10–1000 char comment)
    - `actions/review.ts#submitReview` enforces the unique constraint and recomputes scholarship `averageRating`
    - Render reviews on the scholarship detail page paginated at 10/page, ordered `createdAt desc`
    - _Requirements: 6.3, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ] 13.5* Write property test for scholarship average rating
    - **Property 9: Scholarship average rating is the arithmetic mean**
    - **Validates: Requirements 10.5**
    - Generate review sets and assert displayed average equals `sum/|R|` for `|R|>0` and `null` for `|R|=0`; verify recomputation after insert/delete
    - _Requirements: 10.5_

  - [x] 13.6 Build the My Applied Scholarships tracking page
    - `app/(authenticated)/my-applications/page.tsx` listing user's applications sorted by `createdAt desc` with status badge (color + text label) and admin feedback when present
    - Empty state with link to browse scholarships
    - Show payment status when scholarship has fees > 0
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 30.6_

  - [x] 13.7 Build the user-submitted scholarship form
    - `app/(authenticated)/scholarships/new/page.tsx` with `components/forms/scholarship-submission-form.tsx` (client, RHF + Zod)
    - `actions/scholarship.ts#createScholarshipSubmission` sets `isApproved=false` and `postedById=session.user.id`; rejects when the `userSubmittedScholarships` feature flag is disabled
    - Post-submit success message indicating pending approval
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ] 13.8* Write property test for user-submitted scholarship defaults
    - **Property 11: User-submitted scholarship defaults**
    - **Validates: Requirements 11.2**
    - Generate non-admin user submissions; assert persisted record has `isApproved=false` and `postedById=currentUser.id`
    - _Requirements: 11.2_

- [ ] 14. Build application submission and payment flow
  - [x] 14.1 Build the multi-step application form
    - `app/(authenticated)/scholarships/[id]/apply/page.tsx` with `components/forms/application-form-stepper.tsx` (client) — 3 steps (Personal, Academic, Address), step gating via `form.trigger(stepFields)`
    - Reject duplicate applications using `Application_userId_scholarshipId_key` constraint
    - On success show toast and redirect to `/my-applications` within 3s
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 14.2 Implement the payment provider seam
    - `lib/payment/provider.ts` exposing `createCheckout({ amount, applicationId })` returning `{ url, transactionId, expiresAt }` (30-min expiry); reference Stripe Checkout
    - `actions/payment.ts#initiateCheckout` creates a `Payment` row with `paymentStatus=UNPAID` and `expiresAt` and returns the checkout URL
    - Skip the payment step when `scholarship.fees = 0`; persist Application immediately with `paymentStatus=UNPAID` (treated as N/A)
    - Reject when the `paymentProcessing` feature flag is disabled
    - _Requirements: 30.1, 30.2, 30.3, 30.4_

  - [x] 14.3 Implement the payment webhook
    - `app/api/webhooks/payment/route.ts` verifies the provider signature (raw body), updates the `Payment` (`PAID`/`FAILED`) and linked `Application` (`paymentStatus=PAID`, `status=PENDING`)
    - Return 400 on signature mismatch
    - _Requirements: 30.3, 30.4_

  - [x] 14.4 Implement payment expiry job
    - `lib/payment/expire.ts#expireStalePayments()` sets `paymentStatus=EXPIRED` where `createdAt < now() - 30 minutes ∧ status ∉ {PAID, REFUNDED}`
    - Wire to a Vercel Cron route `app/api/cron/expire-payments/route.ts` (auth-protected with `CRON_SECRET`)
    - _Requirements: 30.5_

  - [ ] 14.5* Write property test for payment fee gating
    - **Property 28: Payment fee gating**
    - **Validates: Requirements 30.1, 30.2**
    - Generate scholarships with `fees ≥ 0`; assert flow includes payment step iff `fees > 0`, otherwise persists directly with `paymentStatus=UNPAID`
    - _Requirements: 30.1, 30.2_

  - [ ] 14.6* Write property test for payment success persistence
    - **Property 29: Payment success persistence**
    - **Validates: Requirements 30.3**
    - Generate webhook payloads and assert post-handling `Application.paymentStatus=PAID`, `status=PENDING`, and a `Payment` with `transactionId=T` linked to A exists
    - _Requirements: 30.3_

  - [ ] 14.7* Write property test for payment expiry
    - **Property 30: Payment expiry**
    - **Validates: Requirements 30.5**
    - Generate `Payment` arbitraries and assert the expiry process flips stale unpaid rows to `EXPIRED` and allows new attempts
    - _Requirements: 30.5_

- [ ] 15. Build the notification system
  - [x] 15.1 Emit notifications on triggering events
    - In application status-change, scholarship-approval, and payment-confirmed Server Actions, insert a `Notification` row with the appropriate `type` and `relatedEntityId`
    - _Requirements: 33.1_

  - [x] 15.2 Build notification bell, dropdown, and pages
    - `components/layout/notification-bell.tsx` (client) polls `/api/notifications/unread-count` (Route Handler) every 60s; badge shows exact count up to 99 and `"99+"` above; hidden at 0
    - `app/api/notifications/unread-count/route.ts` returns `{ count }` for the current user
    - `components/layout/notification-dropdown.tsx` (client) lazily loads ≤20 latest via `actions/notification.ts#getRecent`; clicking marks read and navigates
    - `app/(authenticated)/notifications/page.tsx` with full list and "Mark all as read" action
    - _Requirements: 33.2, 33.3, 33.4, 33.5, 33.6_

  - [ ] 15.3* Write property test for notification system invariants
    - **Property 21: Notification system invariants**
    - **Validates: Requirements 33.1, 33.2, 33.3, 33.4, 33.5, 33.6**
    - Generate status-change events and N (unread count) arbitraries; assert one notification row per event, badge format (≤99, `"99+"`, hidden at 0), `markAllAsRead` clears unread, dropdown returns ≤20 sorted by `createdAt desc`
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 33.6_

- [ ] 16. Build the admin dashboard core
  - [x] 16.1 Build the dashboard summary page
    - `app/(dashboard)/dashboard/page.tsx` showing total counts (scholarships, universities, users, applications), 12-month application-trend chart, scholarship-by-category chart, 10 most recent applications, ≤10 pending scholarships
    - Lazy-load Recharts via `next/dynamic` with skeleton fallback (bundle size > 50KB)
    - Set `export const dynamic = "force-dynamic"`
    - Render error retry UI on data fetch failure
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 25.4_

  - [x] 16.2 Build dashboard chart and stat-card components
    - `components/dashboard/stat-card.tsx`, `components/dashboard/applications-trend-chart.tsx`, `components/dashboard/category-distribution-chart.tsx` (all client because Recharts is client-only)
    - _Requirements: 16.3_

- [ ] 17. Build admin scholarship management
  - [x] 17.1 Build the admin scholarships list and CRUD forms
    - `app/(dashboard)/dashboard/scholarships/page.tsx` paginated 10/page with search and filters (category, approval, university)
    - `app/(dashboard)/dashboard/scholarships/new/page.tsx` and `app/(dashboard)/dashboard/scholarships/[id]/edit/page.tsx`
    - `components/forms/scholarship-form.tsx` (client) backed by `actions/scholarship.ts#createScholarship`/`updateScholarship`
    - `components/dashboard/data-table.tsx` (server table with client islands) with confirmation prompt for delete
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.7_

  - [x] 17.2 Build the approvals workflow page
    - `app/(dashboard)/dashboard/approvals/page.tsx` paginated 20/page sorted by submission date asc; show submitter name + email
    - `actions/scholarship.ts#approveScholarship(id)` sets `isApproved=true`; `rejectScholarship(id)` deletes the record after a confirmation prompt
    - Trigger `revalidateTag(CACHE_TAGS.scholarshipList)` and `revalidateTag('sitemap')`
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 17.6_

  - [ ] 17.3* Write property test for approval lifecycle
    - **Property 12: Approval lifecycle**
    - **Validates: Requirements 17.6, 21.3, 21.5**
    - Generate pending scholarships; assert approve sets `isApproved=true` and S appears in public listings; reject deletes S and it is no longer retrievable
    - _Requirements: 17.6, 21.3, 21.5_

- [ ] 18. Build admin university management
  - [x] 18.1 Build the admin universities list and CRUD forms
    - `app/(dashboard)/dashboard/universities/page.tsx` paginated 10/page with name/country search
    - `new`/`[id]/edit` pages and `components/forms/university-form.tsx` (client, RHF + Zod, UploadThing logo)
    - `actions/university.ts#createUniversity`/`updateUniversity`/`deleteUniversity` (with associated-scholarships count in confirmation), `toggleAcceptingApplications`
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

- [ ] 19. Build admin user management
  - [x] 19.1 Build the admin users list and detail
    - `app/(dashboard)/dashboard/users/page.tsx` paginated 10/page with name/email search; show role, registration date
    - `app/(dashboard)/dashboard/users/[id]/page.tsx` showing applied scholarships and bookmarks counts
    - `actions/user.ts#changeRole(targetUserId, newRole)` enforces `actor.id !== target.id` returning `FORBIDDEN_SELF_CHANGE`
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [ ] 19.2* Write property test for self-role-change rejection
    - **Property 32: Self-role-change rejection**
    - **Validates: Requirements 19.2, 19.4**
    - Generate `(adminId, targetId, newRole)` arbitraries; assert `changeRole` succeeds iff `adminId !== targetId`, otherwise returns `FORBIDDEN_SELF_CHANGE` and target role unchanged
    - _Requirements: 19.2, 19.4_

- [ ] 20. Build admin application management
  - [x] 20.1 Build the admin applications list, detail, and status updates
    - `app/(dashboard)/dashboard/applications/page.tsx` paginated 10/page with status filter and applicant/scholarship filters
    - `app/(dashboard)/dashboard/applications/[id]/page.tsx` showing applicant fields + scholarship summary
    - `actions/application.ts#updateApplicationStatus(id, status, feedback?)` enforcing the state-machine: only `PENDING→PROCESSING`, `PROCESSING→COMPLETED|REJECTED`; emit notification on transition
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_

  - [ ] 20.2* Write property test for application status state machine
    - **Property 10: Application status state machine**
    - **Validates: Requirements 20.3**
    - Enumerate `(current, next)` pairs and assert allowed only for the three valid transitions; otherwise returns error and status unchanged
    - _Requirements: 20.3_

- [ ] 21. Build admin reports and CSV export
  - [x] 21.1 Build the reports page
    - `app/(dashboard)/dashboard/reports/page.tsx` with date-range picker (default last 30 days, max 365), granularity (daily/weekly/monthly)
    - Render application-status, category, and registration-trend charts (lazy-loaded Recharts)
    - Empty state when range has no records
    - _Requirements: 31.1, 31.2, 31.3, 31.5_

  - [x] 21.2 Implement CSV export
    - `lib/csv.ts` exporting `toCsv(rows, columns)` and `parseCsv(text)`; first row is the header
    - "Export CSV" button triggers download with currently-filtered report rows
    - _Requirements: 31.4, 31.6_

  - [ ] 21.3* Write property test for report bucket sums
    - **Property 19: Report bucket sum equals window total**
    - **Validates: Requirements 16.3, 31.1, 31.2, 31.3**
    - Generate `(start, end, granularity, dataset)` arbitraries with `end-start ≤ 365 days`; assert sum of bucket counts equals total in window; assert the 12-month dashboard chart has exactly 12 buckets
    - _Requirements: 16.3, 31.1, 31.2, 31.3_

  - [ ] 21.4* Write property test for CSV export round-trip
    - **Property 20: CSV export round-trip**
    - **Validates: Requirements 31.4, 31.6**
    - Generate typed row datasets and assert `parseCsv(toCsv(D)) === D` and the first row equals the column header
    - _Requirements: 31.4, 31.6_

- [ ] 22. Build admin settings, help, and feature flags
  - [x] 22.1 Build the settings page and platform-config Server Action
    - `app/(dashboard)/dashboard/settings/page.tsx` (ADMIN-only via `requireRole(['ADMIN'])`, otherwise `redirect('/')`)
    - `components/forms/settings-form.tsx` (client, RHF + Zod) for platform name (1–100), description (1–500), and feature flags
    - `actions/settings.ts#updateSettings` upserts the singleton `PlatformSettings` row within 2 seconds and revalidates dependent caches
    - _Requirements: 34.1, 34.2, 34.4, 34.5_

  - [x] 22.2 Enforce feature flags across UI and server
    - `lib/feature-flags.ts#isEnabled(flag)` reads `PlatformSettings`
    - Hide user-submission CTAs and reject `createScholarshipSubmission` with `FEATURE_DISABLED` when off
    - Hide payment UI and reject `initiateCheckout` with `FEATURE_DISABLED` when off
    - _Requirements: 34.3_

  - [ ] 22.3* Write property test for feature flag enforcement
    - **Property 33: Feature flag enforcement**
    - **Validates: Requirements 34.3**
    - For each flag in `{userSubmittedScholarships, paymentProcessing}` set to `false`, assert the related UI is not rendered and Server Actions return `FEATURE_DISABLED`
    - _Requirements: 34.3_

  - [x] 22.4 Build the admin help page
    - `app/(dashboard)/dashboard/help/page.tsx` (server) with sections covering scholarship management, university management, application processing, and user role workflows
    - _Requirements: 29.3_

- [ ] 23. Build SEO infrastructure (sitemap, robots, JSON-LD)
  - [x] 23.1 Implement sitemap and robots
    - `app/sitemap.ts` queries Prisma for all `isApproved=true` scholarships and all universities plus the static public pages; tagged with `'sitemap'`
    - `app/robots.ts` allows public pages and disallows `/dashboard`, `/profile`, `/my-*`, `/notifications`, `/api/*`
    - _Requirements: 24.2, 24.3_

  - [x] 23.2 Wire JSON-LD into the scholarship detail page
    - Render the `scholarshipJsonLd(scholarship)` payload via `<script type="application/ld+json">` server-side
    - _Requirements: 24.5_

  - [ ] 23.3* Write property test for sitemap completeness
    - **Property 25: Sitemap completeness**
    - **Validates: Requirements 24.2**
    - Generate DB states and assert sitemap contains exactly one `<url>` per approved scholarship, per university, plus static public pages, and no entries for unapproved scholarships or authenticated routes
    - _Requirements: 24.2_

- [ ] 24. Build error handling, 404, and global accessibility shell
  - [x] 24.1 Implement error boundaries and 404
    - `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`
    - Each error page exposes a `reset()` retry control and a home link
    - _Requirements: 25.7, 28.1, 28.2_

  - [x] 24.2 Wire Sonner toasts and ARIA live regions
    - Configure `<Toaster richColors position="top-right" />` already in root layout
    - Helper `lib/toast.ts` with `toastSuccess`, `toastError` enforcing 3s/5s durations, manual dismiss, and `aria-live` semantics
    - _Requirements: 27.6, 28.3, 28.4_

  - [x] 24.3 Add database-503 fallback for Route Handlers
    - Wrap Route Handler queries with a Prisma error catcher returning `503` and `Retry-After: 30` for `P1001`/`P1002`
    - _Requirements: 28.5_

- [ ] 25. Render-completeness component tests
  - [ ] 25.1* Write component test for card render completeness
    - **Property 34: Card render completeness**
    - **Validates: Requirements 5.9, 6.2, 12.2, 12.4, 13.2, 14.1, 20.2, 21.6**
    - Use React Testing Library + fast-check to generate `ScholarshipCardDTO`, `UniversityCardDTO`, `ApplicationRowDTO` arbitraries; assert rendered output contains every required field; for `ApplicationRow`, assert status renders with both color cue and text label
    - _Requirements: 5.9, 6.2, 12.2, 12.4, 13.2, 14.1, 20.2, 21.6_

- [ ] 26. Final integration and wiring
  - [x] 26.1 Wire all navigation entries
    - Confirm Navbar links cover Home, Scholarships, Universities, Compare, Guide, Help, plus user menu and notification bell
    - Confirm dashboard sidebar covers Dashboard, Scholarships, Universities, Users, Applications, Approvals, Reports, Settings, Help
    - _Requirements: 23.7, 29.1, 29.2_

  - [x] 26.2 Wire `revalidateTag`/`revalidatePath` calls in every mutating Server Action
    - Confirm every action that modifies scholarships, universities, applications, reviews, bookmarks, settings, or notifications invalidates the relevant cache tags and paths
    - _Requirements: 25.5_

  - [x] 26.3 Configure `next.config.ts` and image hosts
    - Confirm `images.remotePatterns` lists the UploadThing CDN, set `experimental.serverActions.bodySizeLimit` if needed, set `output: 'standalone'` if deploying to a Node target
    - _Requirements: 26.1, 25.1_

  - [x] 26.4 Run final lint, typecheck, and build
    - Execute `npm run lint`, `tsc --noEmit`, `next build`; resolve any remaining errors
    - _Requirements: 1.9, 1.12_

- [ ] 27. Final checkpoint - all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; they are still scheduled in the dependency graph.
- Property tests are placed close to the implementation they validate so regressions surface immediately.
- Each top-level epic ends in a fully wired, demoable slice — no orphaned code left between phases.
- Checkpoints (Tasks 12 and 27) provide explicit pause points for reviewing test results before the next milestone.
- Property tags follow the `Feature: scholar-vista-nextjs, Property N: <Title>` format defined in the design's Testing Strategy section.
- The implementation language is **TypeScript** throughout, matching the design.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "1.5"] },
    { "id": 3, "tasks": ["2.1", "3.1", "4.1", "4.3", "4.4", "4.7", "4.9"] },
    { "id": 4, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.4", "3.5", "4.2", "4.5", "4.6", "4.8"] },
    { "id": 5, "tasks": ["2.4", "5.1", "5.2", "6.1", "7.1", "7.2", "7.3"] },
    { "id": 6, "tasks": ["2.5", "2.6", "5.3", "5.4", "6.2", "6.3", "7.6"] },
    { "id": 7, "tasks": ["5.5", "5.6", "6.4", "6.5", "7.4", "7.5", "8.2", "8.10", "9.1", "10.1", "10.2", "11.1"] },
    { "id": 8, "tasks": ["8.1", "8.3", "8.6", "9.2", "11.2"] },
    { "id": 9, "tasks": ["8.4", "8.5", "8.7", "8.8", "8.9", "9.3", "9.4"] },
    { "id": 10, "tasks": ["13.1", "13.2", "13.4", "13.6", "13.7", "15.1", "15.2"] },
    { "id": 11, "tasks": ["13.3", "13.5", "13.8", "14.1", "15.3"] },
    { "id": 12, "tasks": ["14.2", "14.3", "14.4"] },
    { "id": 13, "tasks": ["14.5", "14.6", "14.7", "16.1", "16.2"] },
    { "id": 14, "tasks": ["17.1", "17.2", "18.1", "19.1", "20.1", "21.1", "22.1", "22.4", "23.1", "23.2", "24.1", "24.2", "24.3"] },
    { "id": 15, "tasks": ["17.3", "19.2", "20.2", "21.2", "22.2"] },
    { "id": 16, "tasks": ["21.3", "21.4", "22.3", "23.3", "25.1"] },
    { "id": 17, "tasks": ["26.1", "26.2", "26.3"] },
    { "id": 18, "tasks": ["26.4"] }
  ]
}
```
