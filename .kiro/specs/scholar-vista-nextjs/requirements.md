# Requirements Document

## Introduction

ScholarVista is a full-stack scholarship management platform rebuilt as a Next.js application using the App Router, TypeScript, Tailwind CSS, and shadcn/ui. The project is bootstrapped from the [next-js-boilerplate-with-better-auth](https://github.com/SarcasticSphinx/next-js-boilerplate-with-better-auth) boilerplate, which provides Better Auth authentication, Prisma ORM with PostgreSQL (NeonDB), and a well-structured project foundation. All boilerplate references to "HomeX" or "homex-crm" will be renamed to "ScholarVista" / "scholar-vista". The platform enables students to discover, compare, and apply for scholarships while providing administrators and moderators with tools to manage scholarships, universities, users, and applications. All dependencies and tools use their latest stable versions at the time of project initialization.

## Glossary

- **Platform**: The ScholarVista Next.js web application (latest stable version, App Router)
- **User**: An authenticated individual with the "USER" role who browses and applies for scholarships
- **Admin**: An authenticated individual with the "ADMIN" role who has full system management access
- **Moderator**: An authenticated individual with the "MODERATOR" role who assists with content management
- **Scholarship**: A financial aid listing with details including title, university, category, deadline, and requirements
- **University**: An educational institution registered on the platform with profile information
- **Application**: A submitted request by a User to be considered for a specific Scholarship
- **Review**: A rating and comment submitted by a User for a Scholarship
- **Bookmark**: A saved reference to a Scholarship by a User for later viewing
- **Auth_Service**: The Better Auth library used for identity management (email/password, OAuth)
- **Database**: The PostgreSQL database hosted on NeonDB, accessed via Prisma ORM
- **Image_Service**: The UploadThing service used for file/image upload and storage
- **API_Layer**: The Next.js API route handlers and Server Actions that process server-side requests
- **Dashboard**: The administrative interface for Admins and Moderators
- **Theme_System**: The dark/light mode toggle system using next-themes
- **Prisma**: The ORM used for type-safe database access and schema management

## Requirements

### Requirement 1: Project Initialization and Architecture

**User Story:** As a developer, I want a properly initialized Next.js project based on the Better Auth boilerplate with all names and references updated to ScholarVista, so that I have a solid foundation for building the platform.

#### Acceptance Criteria

1. THE Platform SHALL be initialized by cloning the next-js-boilerplate-with-better-auth repository and renaming all project references from "HomeX"/"homex-crm" to "ScholarVista"/"scholar-vista" in package.json name field, README title, application metadata, page titles, and any hardcoded brand strings
2. THE Platform SHALL use Next.js (latest stable version) with the App Router and TypeScript enabled
3. THE Platform SHALL use Tailwind CSS (latest stable version) for styling with the shadcn/ui component library integrated
4. THE Platform SHALL use Prisma ORM (latest stable version) with PostgreSQL hosted on NeonDB as the database
5. THE Platform SHALL use Better Auth (latest stable version) for authentication
6. THE Platform SHALL use UploadThing (latest stable version) for file and image uploads
7. THE Platform SHALL use the latest stable versions of all dependencies at the time of project initialization
8. THE Platform SHALL organize code using the boilerplate folder structure: app (routes), components, lib, hooks, types, actions, and prisma directories
9. THE Platform SHALL include an ESLint configuration file and the lint command defined in package.json SHALL execute without errors on the initial codebase
10. THE Platform SHALL use environment variables for all sensitive configuration values including DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, and UPLOADTHING credentials
11. THE Platform SHALL include a .env.example file listing all required environment variable keys (DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, UPLOADTHING_TOKEN) without secret values
12. WHEN all required environment variables are configured, THE Platform SHALL complete the build process (next build) without TypeScript compilation errors or module resolution failures
13. WHEN a developer runs the dependency installation command, THE Platform SHALL install all packages without unresolved peer dependency conflicts

---

### Requirement 2: Database Schema Design

**User Story:** As a developer, I want a comprehensive Prisma schema that models all platform entities, so that the database supports all scholarship management features.

#### Acceptance Criteria

1. THE Database SHALL extend the boilerplate's existing User, Session, Account, and Verification models for Better Auth compatibility by adding role (UserRole, default USER), profilePicture, educationalLevel, major, country, city, and dateOfBirth fields to the User model
2. THE Database SHALL include a UserRole enum with values ADMIN, MODERATOR, and USER
3. THE Database SHALL include a Scholarship model with fields for title (max 200 characters), university relation, category (ScholarshipCategory enum: UNDERGRADUATE, MASTERS, PHD, POSTDOC, EXCHANGE, SHORT_COURSE), subject (max 100 characters), description (max 5000 characters), stipend (Decimal, 0.00 to 999999999.99), coverage (max 500 characters describing what expenses are covered), location (max 200 characters), requirements (max 3000 characters), deadline (DateTime), applicationLink (valid URL, max 500 characters), fees (Decimal, 0.00 to 999999.99), isApproved (Boolean, default false), postedBy relation to User, and createdAt/updatedAt timestamps
4. THE Database SHALL include a University model with fields for name (max 200 characters), logo (URL string), contactEmail (max 254 characters), website (valid URL, max 500 characters), description (max 3000 characters), address (max 300 characters), country (max 100 characters), city (max 100 characters), worldRank (Integer, 1 to 30000), type (UniversityType enum: PUBLIC, PRIVATE, COMMUNITY), establishedYear (Integer, 1000 to current year), isPartner (Boolean, default false), acceptingApplications (Boolean, default true), and createdAt/updatedAt timestamps
5. THE Database SHALL include an Application model with fields for user relation, scholarship relation, applicantName (max 150 characters), phone (max 20 characters), gender (Gender enum: MALE, FEMALE, OTHER), applyingDegree (max 100 characters), sscResult (max 20 characters), hscResult (max 20 characters), subjectCategory (max 100 characters), village (max 200 characters), district (max 100 characters), country (max 100 characters), status (ApplicationStatus enum: PENDING, PROCESSING, COMPLETED, REJECTED, default PENDING), paymentStatus (PaymentStatus enum: UNPAID, PAID, REFUNDED, default UNPAID), feedback (max 1000 characters, nullable), and createdAt/updatedAt timestamps
6. THE Database SHALL include a Review model with fields for user relation, scholarship relation, ratingPoint (Integer, 1 to 5), comment (max 2000 characters), and createdAt timestamp
7. THE Database SHALL include a Payment model with fields for user relation, scholarship relation, amount (Decimal, 0.01 to 999999.99), transactionId (unique string, max 100 characters), paymentStatus (PaymentStatus enum: UNPAID, PAID, REFUNDED), and createdAt timestamp
8. THE Database SHALL include a Notification model with fields for user relation, message (max 500 characters), type (NotificationType enum: APPLICATION_STATUS_CHANGE, SCHOLARSHIP_APPROVED, PAYMENT_CONFIRMED), isRead (Boolean, default false), relatedEntityId (nullable string referencing the associated record), and createdAt timestamp
9. THE Database SHALL include a Bookmark model with fields for user relation, scholarship relation, and createdAt timestamp, with a unique constraint on the combination of userId and scholarshipId
10. THE Database SHALL enforce referential integrity with foreign key constraints on all relations, a unique constraint on Application (userId, scholarshipId) to prevent duplicate applications, a unique constraint on Review (userId, scholarshipId) to prevent duplicate reviews, and indexes on frequently queried foreign key columns (userId, scholarshipId, universityId)
11. THE Database SHALL define cascade deletion rules such that deleting a User removes associated Applications, Reviews, Bookmarks, Payments, and Notifications, and deleting a Scholarship removes associated Reviews and Bookmarks

---

### Requirement 3: Authentication and Authorization

**User Story:** As a user, I want to register and log in using Better Auth, so that I can access personalized features of the platform.

#### Acceptance Criteria

1. THE Auth_Service SHALL support email/password registration and login using Better Auth's emailAndPassword configuration, requiring a valid email format and a password between 8 and 128 characters
2. THE Auth_Service SHALL support Google OAuth sign-in as an alternative authentication method
3. WHEN a new user registers, THE Platform SHALL create a User record in the Database with a default role of USER
4. IF registration or login fails due to invalid credentials, duplicate email, or OAuth provider error, THEN THE Platform SHALL display an error message indicating the reason for failure without revealing whether an email is already registered
5. THE Platform SHALL maintain authenticated session state across page navigations using Better Auth's session management with next-cookies plugin
6. WHEN an unauthenticated user attempts to access a route requiring authentication (application submission, bookmarks, profile, change-password, or Dashboard pages), THE Platform SHALL redirect the user to the sign-in page with a return URL preserving the originally requested path
7. THE Platform SHALL support three roles with the following access boundaries: USER role may access personal features (applications, bookmarks, profile, reviews); MODERATOR role may additionally access the Dashboard for content management; ADMIN role may access all Dashboard features including user management and settings
8. WHEN a user logs out, THE Platform SHALL invalidate the session and redirect to the home page
9. IF a session token is invalid or expired, THEN THE API_Layer SHALL return a 401 Unauthorized response
10. THE Platform SHALL provide a change-password page for authenticated users, requiring the current password and a new password between 8 and 128 characters
11. WHEN a user without ADMIN or MODERATOR role attempts to access a Dashboard route, THE Platform SHALL redirect the user to the home page

---

### Requirement 4: Home Page and Landing Experience

**User Story:** As a visitor, I want an engaging home page that showcases featured scholarships and platform value, so that I understand what ScholarVista offers.

#### Acceptance Criteria

1. THE Platform SHALL render the home page using server-side rendering for SEO and initial load performance
2. THE Platform SHALL display a hero section with a search input that navigates to the scholarship browsing page with the entered query as a URL parameter, and a call-to-action button that navigates to the scholarship browsing page
3. THE Platform SHALL display a section of up to 6 featured scholarships (approved scholarships sorted by most recent posting date) fetched from the Database, showing each scholarship's title, university, category, deadline, and stipend
4. THE Platform SHALL display platform statistics including total approved scholarships count, total universities count, and total applications with COMPLETED status count
5. THE Platform SHALL display a section of up to 6 partner universities (universities with partnership status set to true) fetched from the Database, showing each university's name and logo
6. WHILE the home page is fetching data from the Database, THE Platform SHALL display loading skeleton components matching the layout dimensions of the content sections
7. THE Platform SHALL render the home page with complete metadata including title, description, and Open Graph tags for SEO
8. IF the Database is unavailable when loading the home page, THEN THE Platform SHALL display an error message indicating the content could not be loaded and provide a retry option

---

### Requirement 5: Scholarship Browsing and Search

**User Story:** As a user, I want to browse and search scholarships with advanced filters, so that I can find scholarships relevant to my profile.

#### Acceptance Criteria

1. THE Platform SHALL display a paginated list of approved scholarships with card-based layout showing 12 scholarships per page
2. WHEN a user enters a search query of at least 2 characters, THE Platform SHALL filter scholarships by case-insensitive partial match on title, university name, or subject name
3. THE Platform SHALL provide filter options for scholarship category (Undergraduate, Masters, PhD, Postdoc, Exchange, Short Course)
4. THE Platform SHALL provide filter options for location/country
5. THE Platform SHALL provide filter options for funding type (Merit-based, Need-based, etc.)
6. THE Platform SHALL provide a deadline filter to show scholarships with deadlines within the next 7, 30, or 90 days from the current date
7. WHEN filters are applied, THE Platform SHALL update the URL query parameters to enable shareable filtered views
8. THE Platform SHALL support sorting scholarships by deadline (soonest first), rating (highest first), and date posted (newest first), with date posted (newest first) as the default sort order
9. THE Platform SHALL display each scholarship card with title, university, category, deadline, stipend, and location
10. IF the current search query or applied filters return no matching scholarships, THEN THE Platform SHALL display an empty state message indicating no scholarships match the criteria and suggest adjusting the filters
11. WHEN a user navigates to a page number that exceeds the total available pages, THE Platform SHALL display the last available page of results

---

### Requirement 6: Scholarship Detail Page

**User Story:** As a user, I want to view complete scholarship details, so that I can make an informed decision about applying.

#### Acceptance Criteria

1. THE Platform SHALL render scholarship detail pages using server-side rendering with dynamic metadata (title, description, and Open Graph tags) for SEO
2. THE Platform SHALL display all scholarship information including title, university, description, requirements, stipend, coverage, deadline, application fees, and application link
3. THE Platform SHALL display the scholarship average rating and a list of reviews ordered by most recent first, showing up to 10 reviews initially with the ability to load more
4. IF the user is authenticated, THEN THE Platform SHALL display an "Apply Now" button that navigates to the application form
5. WHEN an unauthenticated user clicks "Apply Now", THE Platform SHALL redirect to the sign-in page with a return URL that navigates back to the scholarship detail page after sign-in
6. IF the user is authenticated, THEN THE Platform SHALL display a bookmark toggle button indicating the current bookmark state
7. THE Platform SHALL display up to 6 related scholarships that share the same category or university as the current scholarship
8. IF the scholarship deadline has passed, THEN THE Platform SHALL display a visual indicator that the deadline has expired and disable the "Apply Now" button
9. IF the requested scholarship does not exist or is not approved, THEN THE Platform SHALL display a 404 page

---

### Requirement 7: Scholarship Application

**User Story:** As a user, I want to apply for scholarships through a multi-step form, so that I can submit my application with all required information.

#### Acceptance Criteria

1. THE Platform SHALL present a multi-step application form with 3 sequential sections: personal information, academic details, and address
2. WHEN a user attempts to proceed to the next form step, THE Platform SHALL validate the current step's fields using Zod schema validation and prevent progression if validation fails
3. THE Platform SHALL require the following fields with these constraints: applicant name (2-100 characters), phone number (valid international or local format, 7-15 digits), gender (one of: Male, Female, Other), applying degree (one of: Undergraduate, Masters, PhD, Postdoc), SSC result (GPA between 0.00 and 5.00), HSC result (GPA between 0.00 and 5.00), subject category, and address consisting of village (max 100 characters), district (max 100 characters), and country
4. WHEN a user submits a completed application, THE API_Layer SHALL create an Application record in the Database with status PENDING
5. IF a required field is missing or invalid, THEN THE Platform SHALL display an error message adjacent to the invalid field indicating the specific validation rule that failed
6. IF a user attempts to submit an application for a scholarship they have already applied to, THEN THE Platform SHALL display an error message indicating a duplicate application exists and prevent the submission
7. WHEN an application is submitted successfully, THE Platform SHALL display a success confirmation message and redirect to the "My Applications" page within 3 seconds

---

### Requirement 8: Scholarship Bookmarks

**User Story:** As a user, I want to bookmark scholarships for later review, so that I can keep track of interesting opportunities.

#### Acceptance Criteria

1. WHEN an authenticated user clicks the bookmark button on a scholarship, THE API_Layer SHALL create a bookmark relation between the user and scholarship in the Database and THE Platform SHALL update the bookmark icon to a filled state within 1 second
2. WHEN an authenticated user clicks the bookmark button on an already-bookmarked scholarship, THE API_Layer SHALL remove the bookmark relation from the Database and THE Platform SHALL update the bookmark icon to an unfilled state within 1 second
3. THE Platform SHALL display a paginated "My Bookmarks" page listing bookmarked scholarships for the authenticated user, displaying each bookmark with scholarship title, university name, category, deadline, stipend, and location, with a maximum of 12 scholarships per page
4. THE Platform SHALL visually indicate bookmarked scholarships with a filled bookmark icon across all scholarship listings and detail pages
5. IF an unauthenticated user clicks the bookmark button on a scholarship, THEN THE Platform SHALL redirect the user to the sign-in page with a return URL to the scholarship page

---

### Requirement 9: User Profile Management

**User Story:** As a user, I want to manage my profile information, so that my details are up to date for scholarship applications.

#### Acceptance Criteria

1. THE Platform SHALL display a profile page showing the user's display name, email, profile picture, educational level, major, country, city, and date of birth
2. WHEN a user updates their profile information, THE API_Layer SHALL persist the changes to the Database and THE Platform SHALL display a success toast notification
3. IF a profile update fails due to a server or database error, THEN THE Platform SHALL display an error message indicating the update could not be saved and preserve the user's entered data in the form
4. THE Platform SHALL allow users to upload a profile picture via the Image_Service (UploadThing)
5. THE Platform SHALL validate profile form inputs using Zod schema validation before submission, enforcing: display name between 2 and 100 characters, major maximum 100 characters, date of birth not in the future and not more than 120 years in the past, and country/city maximum 100 characters each
6. IF profile form validation fails, THEN THE Platform SHALL display a specific error message adjacent to each invalid field and prevent form submission
7. THE Platform SHALL display the user's applied scholarships count and bookmarks count on the profile page
8. THE Platform SHALL treat the user's email as read-only on the profile page, preventing direct modification through the profile form

---

### Requirement 10: Reviews System

**User Story:** As a user, I want to leave reviews on scholarships, so that I can share my experience and help other applicants.

#### Acceptance Criteria

1. WHEN an authenticated user submits a review, THE API_Layer SHALL create a Review record with userId, scholarshipId, ratingPoint (integer from 1 to 5 inclusive), and comment (between 10 and 1000 characters)
2. THE Platform SHALL display reviews for a scholarship on the scholarship detail page, paginated at 10 reviews per page, showing user name, rating, comment, and submission date, ordered by most recent first
3. IF a user attempts to submit a review for a scholarship they have already reviewed, THEN THE Platform SHALL reject the submission and display an error message indicating one review per scholarship is allowed
4. THE Platform SHALL display a "My Reviews" page listing all reviews submitted by the authenticated user with scholarship title, rating, comment, and submission date
5. WHEN a review is submitted, THE Platform SHALL recalculate and update the scholarship's average rating
6. IF the comment field is empty or contains fewer than 10 characters or exceeds 1000 characters, THEN THE Platform SHALL display a validation error message adjacent to the comment field indicating the required length

---

### Requirement 11: User-Submitted Scholarships

**User Story:** As a user, I want to submit scholarship listings I discover, so that the platform's database grows with community contributions.

#### Acceptance Criteria

1. THE Platform SHALL provide a "Create Scholarship" form for authenticated users with fields for title (maximum 200 characters), university name, category, subject, description (maximum 2000 characters), stipend, deadline, and application link
2. WHEN a user submits a new scholarship, THE API_Layer SHALL create a Scholarship record with isApproved set to false and the postedBy field set to the authenticated user's ID
3. THE Platform SHALL validate all form fields using Zod schema validation before submission, requiring title, university name, category, subject, description, deadline, and application link as mandatory fields
4. THE Platform SHALL validate that the deadline field is a future date and that the application link is a valid URL format
5. IF the scholarship submission fails due to a server error, THEN THE Platform SHALL display an error message indicating the submission could not be completed and allow the user to retry without losing entered data
6. WHEN a scholarship is submitted successfully, THE Platform SHALL display a confirmation message indicating the submission is pending admin approval

---

### Requirement 12: My Applied Scholarships Tracking

**User Story:** As a user, I want to track the status of my scholarship applications, so that I know where each application stands.

#### Acceptance Criteria

1. THE Platform SHALL display a "My Applied Scholarships" page listing all applications submitted by the authenticated user, sorted by application date in descending order (most recent first)
2. THE Platform SHALL display each application with scholarship title, application date, and current status (PENDING, PROCESSING, COMPLETED, REJECTED)
3. IF feedback has been provided by an administrator for an application, THEN THE Platform SHALL display the feedback text alongside that application entry
4. THE Platform SHALL visually distinguish application statuses using color-coded badges that also include a text label, ensuring status is not conveyed by color alone
5. IF the authenticated user has no submitted applications, THEN THE Platform SHALL display an empty state message indicating no applications have been submitted and providing a link to browse scholarships

---

### Requirement 13: University Listings

**User Story:** As a user, I want to browse universities on the platform, so that I can explore institutions offering scholarships.

#### Acceptance Criteria

1. THE Platform SHALL display a paginated list of universities with card-based layout showing 12 universities per page
2. THE Platform SHALL display each university card with name, logo, country, world rank, and type
3. WHEN a user clicks on a university card, THE Platform SHALL navigate to the university detail page
4. THE Platform SHALL provide search functionality to filter universities by name or country using case-insensitive partial matching
5. WHEN a search query is applied, THE Platform SHALL update the URL query parameters to enable shareable filtered views
6. IF no universities match the search query, THEN THE Platform SHALL display an empty state message indicating no results were found

---

### Requirement 14: University Detail Page

**User Story:** As a user, I want to view detailed university information, so that I can learn about institutions before applying to their scholarships.

#### Acceptance Criteria

1. THE Platform SHALL display university details including name, logo, description, website, country, city, world rank, type, established year, and partnership status
2. THE Platform SHALL display a paginated list of approved scholarships offered by the university, ordered by deadline in ascending order, showing a maximum of 10 scholarships per page
3. THE Platform SHALL render university detail pages with server-side rendering and dynamic SEO metadata including page title containing the university name, meta description, and Open Graph tags
4. IF a user navigates to a university detail page with an identifier that does not match any university in the Database, THEN THE Platform SHALL display a 404 not-found page

---

### Requirement 15: Scholarship Comparison

**User Story:** As a user, I want to compare multiple scholarships side by side, so that I can make better decisions about which to apply for.

#### Acceptance Criteria

1. THE Platform SHALL display an "Add to Compare" control on each scholarship card and scholarship detail page, allowing users to select a minimum of 2 and a maximum of 3 scholarships for comparison
2. IF a user attempts to add a scholarship when 3 scholarships are already selected for comparison, THEN THE Platform SHALL display a notification indicating the maximum of 3 has been reached and prevent the addition
3. WHEN a user adds a scholarship to comparison, THE Platform SHALL persist the selection in browser local storage and retain it until the user manually removes it or clears the comparison
4. WHEN a user removes a scholarship from comparison, THE Platform SHALL remove the selection from browser local storage and update the comparison UI within 1 second
5. IF 2 or more scholarships are selected for comparison, THEN THE Platform SHALL display a "Compare" button in a persistent floating element showing the current selection count
6. WHEN a user clicks the "Compare" button, THE Platform SHALL navigate to a dedicated comparison page displaying a side-by-side table with the following attributes for each selected scholarship: title, university, stipend, coverage, deadline, category, requirements, and rating
7. IF a compared scholarship has a missing attribute value, THEN THE Platform SHALL display a dash character ("-") in the corresponding table cell

---

### Requirement 16: Admin Dashboard

**User Story:** As an admin, I want a dashboard with analytics and quick actions, so that I can monitor and manage the platform effectively.

#### Acceptance Criteria

1. WHEN an Admin or Moderator navigates to the administration section, THE Platform SHALL display a dashboard with summary statistics
2. THE Dashboard SHALL display total counts for scholarships, universities, users, and applications
3. THE Dashboard SHALL display a chart showing application trends grouped by month for the most recent 12 months, and a chart showing scholarship distribution by category
4. THE Dashboard SHALL display the 10 most recently submitted applications and up to 10 scholarships pending approval as quick-access lists
5. WHEN a user without ADMIN or MODERATOR role attempts to access the administration section, THE Platform SHALL redirect to the home page
6. IF the Dashboard data fails to load, THEN THE Platform SHALL display an error message indicating the data could not be retrieved and provide a retry option

---

### Requirement 17: Admin Scholarship Management

**User Story:** As an admin, I want to create, edit, and manage scholarships, so that the platform content stays accurate and up to date.

#### Acceptance Criteria

1. THE Dashboard SHALL display a paginated list of all scholarships (10 items per page) with search by title or university name, and filter options for category, approval status, and university
2. THE Dashboard SHALL provide a form to create new scholarships with required fields: title, university, category, subject, description, stipend, coverage, location, requirements, deadline, application link, and fees, validated using Zod schema validation before submission
3. THE Dashboard SHALL provide a form to edit existing scholarship details, pre-populated with current values for all editable fields: title, university, category, subject, description, stipend, coverage, location, requirements, deadline, application link, and fees
4. WHEN an admin initiates a scholarship deletion, THE Dashboard SHALL display a confirmation prompt before proceeding with the delete operation
5. WHEN an admin confirms scholarship deletion, THE API_Layer SHALL remove the scholarship record and all associated reviews, bookmarks, and applications from the Database
6. THE Dashboard SHALL allow admins to approve user-submitted scholarships by setting isApproved to true, or reject them by deleting the scholarship record from the Database
7. WHEN a scholarship is successfully created, edited, or deleted, THE Dashboard SHALL display a success toast notification and refresh the scholarship list

---

### Requirement 18: Admin University Management

**User Story:** As an admin, I want to manage university listings, so that the platform maintains accurate institutional information.

#### Acceptance Criteria

1. THE Dashboard SHALL display a paginated list of all universities (10 items per page) with search functionality that filters by university name or country
2. THE Dashboard SHALL provide a form to create new universities with required fields for name (maximum 200 characters), logo (uploaded via Image_Service), contact email (valid email format), website (valid URL format), country, city, world rank (positive integer), type, and established year (between 1000 and the current year)
3. THE Dashboard SHALL provide a form to edit existing university details, pre-populated with the university's current values for all fields defined in criterion 2
4. IF a university has associated scholarships, THEN THE Dashboard SHALL display a confirmation prompt indicating the number of associated scholarships before allowing deletion
5. WHEN an admin confirms deletion of a university, THE API_Layer SHALL remove the university record and all associated scholarship records from the Database
6. WHEN an admin toggles the "accepting applications" status for a university, THE API_Layer SHALL persist the updated status to the Database immediately
7. IF a required field is missing or fails validation during university creation or editing, THEN THE Dashboard SHALL display an error message adjacent to the invalid field and prevent form submission

---

### Requirement 19: Admin User Management

**User Story:** As an admin, I want to manage user accounts and roles, so that I can maintain platform security and delegate responsibilities.

#### Acceptance Criteria

1. THE Dashboard SHALL display a paginated list of all users (10 users per page) with search by name or email, showing each user's name, email, role, and registration date
2. THE Dashboard SHALL allow admins to change a user's role between USER, MODERATOR, and ADMIN, except that an admin SHALL NOT be permitted to change their own role
3. THE Dashboard SHALL display user details including registration date, role, applied scholarships count, and bookmarks count
4. WHEN an admin updates a user's role, THE API_Layer SHALL persist the role change to the Database within the same request-response cycle and return the updated user record
5. IF a role update fails due to a Database error or validation failure, THEN THE Dashboard SHALL display an error message indicating the role was not changed and retain the user's previous role in the interface

---

### Requirement 20: Admin Application Management

**User Story:** As an admin, I want to review and process scholarship applications, so that applicants receive timely decisions.

#### Acceptance Criteria

1. THE Dashboard SHALL display a paginated list of all applications (10 items per page) with filters for status (PENDING, PROCESSING, COMPLETED, REJECTED)
2. THE Dashboard SHALL display application details including applicant name, phone number, gender, applying degree, SSC result, HSC result, subject category, address, and the associated scholarship title and deadline
3. WHEN an admin updates an application status, THE API_Layer SHALL persist the status change to the Database and only allow transitions from PENDING to PROCESSING, from PROCESSING to COMPLETED or REJECTED
4. IF the application status update fails, THEN THE API_Layer SHALL return an error response and THE Dashboard SHALL display an error notification indicating the status was not changed
5. THE Dashboard SHALL allow admins to provide optional feedback text (maximum 1000 characters) when updating an application status
6. THE Dashboard SHALL allow filtering applications by scholarship or by applicant name

---

### Requirement 21: Scholarship Approvals Workflow

**User Story:** As an admin, I want a dedicated approvals interface for user-submitted scholarships, so that I can efficiently review community contributions.

#### Acceptance Criteria

1. THE Dashboard SHALL display a paginated list of scholarships with isApproved set to false, ordered by submission date (oldest first), showing a maximum of 20 items per page
2. WHEN an admin selects a pending scholarship for review, THE Dashboard SHALL display the scholarship details including title, university, category, subject, description, stipend, deadline, and application link
3. WHEN an admin approves a scholarship, THE API_Layer SHALL set isApproved to true in the Database
4. WHEN an admin initiates a rejection, THE Dashboard SHALL display a confirmation prompt before proceeding with deletion
5. WHEN an admin confirms rejection of a scholarship, THE API_Layer SHALL delete the scholarship record from the Database
6. THE Dashboard SHALL display the submitter's name and email for each pending scholarship
7. IF an approve or reject operation fails, THEN THE API_Layer SHALL return an error response and THE Dashboard SHALL display an error message indicating the operation could not be completed

---

### Requirement 22: Dark and Light Mode

**User Story:** As a user, I want to toggle between dark and light themes, so that I can use the platform comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Theme_System SHALL support "light", "dark", and "system" theme preferences using the next-themes library
2. WHEN a user selects a theme preference, THE Platform SHALL persist the selection in browser local storage and apply the selected theme within 100 milliseconds without a page reload
3. WHILE the "system" preference is active, THE Platform SHALL follow the operating system's color scheme preference and update the applied theme when the operating system preference changes
4. IF no theme preference is stored in local storage, THEN THE Platform SHALL default to the "system" preference
5. THE Platform SHALL prevent a flash of incorrect theme on initial page load by applying the stored or system-resolved theme before rendering page content
6. THE Platform SHALL render all components with a minimum color contrast ratio of 4.5:1 for normal text and 3:1 for large text in both themes, meeting WCAG 2.1 AA standards or later

---

### Requirement 23: Responsive Design

**User Story:** As a user, I want the platform to work seamlessly on all devices, so that I can access scholarships from my phone, tablet, or desktop.

#### Acceptance Criteria

1. THE Platform SHALL implement a mobile-first responsive design using Tailwind CSS breakpoints: sm (640px), md (768px), lg (1024px), and xl (1280px)
2. WHILE the viewport width is less than 768px, THE Platform SHALL display a mobile navigation menu (hamburger menu) in place of the desktop navigation bar
3. THE Platform SHALL adapt card layouts from a single column on viewports below 640px, to a 2-column grid on viewports between 640px and 1023px, to a 3-column grid on viewports 1024px and above
4. WHILE the viewport width is less than 768px, THE Platform SHALL ensure all interactive elements (buttons, links, form controls) have a minimum touch target size of 44x44 pixels
5. WHILE the viewport width is less than 1024px, THE Dashboard SHALL display the sidebar navigation in a collapsed (hidden) state by default, with a toggle button to expand it as an overlay
6. THE Platform SHALL render all page content without requiring horizontal scrolling on viewports 320px wide and above
7. WHEN the user toggles the mobile navigation menu open, THE Platform SHALL display the navigation links as a vertical list overlay and provide a visible close control to dismiss it

---

### Requirement 24: SEO Optimization

**User Story:** As a platform owner, I want the application to be optimized for search engines, so that scholarships are discoverable through organic search.

#### Acceptance Criteria

1. THE Platform SHALL generate dynamic metadata for all public pages (home, scholarship listing, scholarship detail, university listing, university detail, scholarship guide, and help pages) using Next.js Metadata API, including a title (maximum 60 characters), description (maximum 160 characters), Open Graph tags (og:title, og:description, og:image, og:url), and Twitter Card tags (twitter:title, twitter:description, twitter:image)
2. THE Platform SHALL generate a dynamic sitemap.xml that includes all approved scholarship detail pages and all university detail pages, and THE Platform SHALL regenerate the sitemap when scholarships are approved or removed
3. THE Platform SHALL generate a robots.txt file that allows search engine crawling of public pages and disallows crawling of authenticated routes (dashboard, user profile, my-applications, my-bookmarks, my-reviews, and API routes)
4. THE Platform SHALL use semantic HTML elements (header, main, nav, article, section) throughout the application
5. THE Platform SHALL implement structured data (JSON-LD) for scholarship detail pages using the Schema.org Scholarship type, including the properties: name, description, provider (university name), url, applicationDeadline, and offers (stipend amount and currency)
6. THE Platform SHALL include a canonical URL meta tag on all public pages to prevent duplicate content indexing

---

### Requirement 25: Performance Optimization

**User Story:** As a user, I want the platform to load quickly and feel responsive, so that I have a smooth browsing experience.

#### Acceptance Criteria

1. THE Platform SHALL use Next.js Image component for all content images with automatic optimization, responsive sizing, and lazy loading for below-the-fold images, while above-the-fold images SHALL use the priority attribute to avoid delaying Largest Contentful Paint
2. THE Platform SHALL implement loading skeletons for all data-fetching components that display placeholder shapes matching the expected content layout until data is available
3. THE Platform SHALL use React Server Components for pages that do not require client-side interactivity such as event handlers or browser APIs
4. THE Platform SHALL implement route-based code splitting using Next.js dynamic imports for components whose individual bundle size exceeds 50KB
5. THE Platform SHALL cache scholarship listing data with a revalidation interval of 60 seconds and cache university listing data with a revalidation interval of 300 seconds using Next.js fetch caching or unstable_cache
6. THE Platform SHALL achieve a Lighthouse Performance score of 80 or above on mobile when tested using Lighthouse default mobile emulation (simulated throttling with Moto G Power device profile)
7. IF a dynamically imported component fails to load, THEN THE Platform SHALL display a fallback error message within the component boundary without crashing the page

---

### Requirement 26: Image and File Upload

**User Story:** As a user or admin, I want to upload images for profiles, scholarships, and universities, so that listings have visual content.

#### Acceptance Criteria

1. THE Platform SHALL support image upload via UploadThing for profile pictures (1 image per user), scholarship images (1 image per scholarship), and university logos (1 image per university)
2. THE Platform SHALL validate uploaded images for file type (JPEG, PNG, WebP) and maximum file size of 5MB before initiating the upload to UploadThing
3. IF an uploaded file fails validation due to unsupported file type or exceeding the 5MB size limit, THEN THE Platform SHALL display an error message indicating the specific validation failure and prevent the upload from starting
4. IF an image upload to UploadThing fails due to a network or server error, THEN THE Platform SHALL display an error message indicating the upload failure and allow the user to retry the upload
5. WHILE an image upload is in progress, THE Platform SHALL display a visual progress indicator showing upload completion percentage
6. WHEN an image is uploaded successfully for an entity that already has an associated image, THE Platform SHALL replace the existing image with the newly uploaded image

---

### Requirement 27: Accessibility

**User Story:** As a user with disabilities, I want the platform to be accessible, so that I can use all features with assistive technologies.

#### Acceptance Criteria

1. THE Platform SHALL meet WCAG 2.1 Level AA compliance or later for all interactive components
2. THE Platform SHALL support full keyboard navigation for all interactive elements including a visible focus indicator with a minimum 2px outline that meets a 3:1 contrast ratio against adjacent colors, and SHALL provide a skip-to-main-content link as the first focusable element on every page
3. THE Platform SHALL provide ARIA labels, roles, and state attributes for all custom components conforming to WAI-ARIA 1.2 Authoring Practices, ensuring screen readers can announce the name, role, and current state of each component
4. THE Platform SHALL ensure a minimum color contrast ratio of 4.5:1 for normal text and 3:1 for large text in both themes
5. THE Platform SHALL provide descriptive alt text (maximum 150 characters) for all informational images and SHALL mark decorative images with an empty alt attribute (alt="") so they are ignored by assistive technologies
6. WHEN dynamic content changes occur (toast notifications, form validation errors, or application status updates), THE Platform SHALL announce the change to assistive technologies using appropriate ARIA live regions (aria-live="polite" for non-urgent updates, aria-live="assertive" for errors)

---

### Requirement 28: Error Handling and Feedback

**User Story:** As a user, I want clear error messages and feedback, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. THE Platform SHALL display a custom 404 page for non-existent routes that includes a message indicating the page was not found and a navigation link back to the home page
2. WHEN an unexpected runtime error occurs, THE Platform SHALL display a custom error boundary page (using Next.js error.tsx and global-error.tsx) that includes an error message indicating something went wrong and a button to retry the failed operation or navigate to the home page
3. WHEN an API request fails, THE Platform SHALL display a toast notification (using Sonner) that identifies the failed operation (e.g., "Failed to load scholarships"), auto-dismisses after 5 seconds, and provides a manual dismiss option
4. WHEN a form submission succeeds, THE Platform SHALL display a success toast notification that identifies the completed operation and auto-dismisses after 3 seconds
5. IF the Database connection fails, THEN THE API_Layer SHALL return a 503 Service Unavailable response with a message indicating the service is temporarily unavailable and suggesting the user retry after 30 seconds

---

### Requirement 29: Scholarship Guide and Help

**User Story:** As a user, I want access to scholarship guides and help resources, so that I can navigate the application process effectively.

#### Acceptance Criteria

1. THE Platform SHALL provide a Scholarship Guide page accessible from the main navigation that contains at minimum the following sections: how to search for scholarships, how to apply, how to track application status, and tips for strengthening applications
2. THE Platform SHALL provide a Help page accessible from the main navigation that contains at minimum 5 frequently asked questions with answers covering account management, scholarship applications, bookmarks, reviews, and payment processes, along with platform usage instructions
3. THE Dashboard SHALL provide an Administration Help page accessible from the dashboard sidebar navigation that contains guides for scholarship management, university management, application processing, and user role management workflows
4. THE Platform SHALL render guide and help content using server-side rendering for SEO
5. WHEN a user navigates to the Scholarship Guide or Help page, THE Platform SHALL display the content organized with heading-based sections that are individually linkable via anchor IDs

---

### Requirement 30: Payment Processing

**User Story:** As a user, I want to pay application fees securely, so that I can complete scholarship applications that require payment.

#### Acceptance Criteria

1. WHEN a scholarship has application fees greater than zero, THE Platform SHALL display the fee amount with its currency on the scholarship detail page and on the application form before payment initiation
2. WHEN a user submits an application for a scholarship with fees greater than zero, THE Platform SHALL present a payment step where the user can complete payment before the application is finalized
3. WHEN a payment is completed successfully, THE API_Layer SHALL update the application's paymentStatus to PAID, store the transaction ID, and set the application status to PENDING
4. IF a payment fails or is cancelled, THEN THE Platform SHALL display an error message indicating the reason for failure (e.g., declined, cancelled by user, or timeout) and allow the user to retry payment without re-entering application details
5. IF a payment is not completed within 30 minutes of initiation, THEN THE Platform SHALL mark the payment as EXPIRED and allow the user to initiate a new payment attempt
6. THE Platform SHALL display the payment status (UNPAID, PAID, FAILED, EXPIRED) on the user's applied scholarships page alongside each application that requires payment

---

### Requirement 31: Admin Reports

**User Story:** As an admin, I want to view reports on platform activity, so that I can make data-driven decisions about the platform.

#### Acceptance Criteria

1. THE Dashboard SHALL display a reports page with a date range filter allowing the admin to select a start date and end date, defaulting to the last 30 days, with a maximum selectable range of 365 days
2. THE Dashboard SHALL display application statistics grouped by status (PENDING, PROCESSING, COMPLETED, REJECTED), scholarship category, and time period with selectable granularity of daily, weekly, or monthly intervals
3. THE Dashboard SHALL display user registration trends as a line chart showing the count of new registrations per selected time interval (daily, weekly, or monthly) within the chosen date range
4. THE Dashboard SHALL provide the ability to export the currently displayed report data (application statistics and registration trends) as a CSV file
5. IF no data exists for the selected date range, THEN THE Dashboard SHALL display an empty state message indicating no records were found for the selected period
6. WHEN an admin initiates a CSV export, THE Dashboard SHALL generate and download a file containing column headers and corresponding data rows matching the currently filtered report view

---

### Requirement 32: Internationalization Readiness

**User Story:** As a platform owner, I want the application architecture to support future internationalization, so that the platform can serve users in multiple languages.

#### Acceptance Criteria

1. THE Platform SHALL externalize all user-facing text strings into JSON locale files stored in a messages/ directory at the project root, with English (en) as the default locale file
2. THE Platform SHALL use a consistent date and number formatting approach via the Intl API (Intl.DateTimeFormat and Intl.NumberFormat) with a configurable locale parameter defaulting to "en-US"
3. THE Platform SHALL support right-to-left (RTL) text direction by applying a dir attribute on the root HTML element that can be set to "rtl" based on the active locale configuration

---

### Requirement 33: Notification System

**User Story:** As a user, I want to receive notifications about my application status changes, so that I stay informed without manually checking.

#### Acceptance Criteria

1. WHEN an application status changes, THE Platform SHALL create a Notification record in the Database for the applicant containing the new status value and a reference to the associated application
2. THE Platform SHALL display a notification bell icon in the navigation with an unread count badge showing the exact count up to 99 and displaying "99+" for counts exceeding 99
3. THE Platform SHALL provide a notifications dropdown listing the 20 most recent notifications in reverse chronological order, each displaying the notification message and a relative timestamp
4. WHEN a user clicks a notification, THE Platform SHALL mark that notification as read in the Database and navigate to the relevant application detail page
5. THE Platform SHALL provide a "Mark all as read" action in the notifications dropdown that sets the read status to true for all unread notifications belonging to the authenticated user
6. WHEN all notifications are read, THE Platform SHALL hide the unread count badge from the notification bell icon

---

### Requirement 34: Admin Settings

**User Story:** As an admin, I want to configure platform settings, so that I can customize platform behavior without code changes.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a settings page accessible only to users with the ADMIN role for platform configuration
2. THE Dashboard SHALL allow admins to configure the platform name (between 1 and 100 characters) and description (between 1 and 500 characters) with inline validation errors displayed when limits are exceeded
3. THE Dashboard SHALL allow admins to toggle feature flags for optional features (e.g., user-submitted scholarships, payment processing), and WHEN a feature flag is disabled, THE Platform SHALL hide the corresponding feature's UI elements and reject related API requests
4. WHEN settings are updated, THE API_Layer SHALL persist the changes to the Database within 2 seconds and display a success toast notification upon completion
5. IF a settings update fails due to validation error or Database unavailability, THEN THE Platform SHALL display an error message indicating the failure reason and preserve the admin's unsaved input in the form
