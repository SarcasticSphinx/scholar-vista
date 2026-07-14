/**
 * Comprehensive, real-world seed data for ScholarVista.
 *
 * Seeds:
 *   - 1 ADMIN, 1 MODERATOR, and 3 USER accounts (each with a Better Auth
 *     credential `Account` containing the hashed default password).
 *   - 20 real universities across 15 countries (mix of public/private,
 *     ranks, and partner status).
 *   - 37 real, well-known scholarships covering all six
 *     `ScholarshipCategory` values (Chevening, Gates Cambridge, Rhodes,
 *     Fulbright, DAAD, Erasmus Mundus, Schwarzman, MEXT, Australia Awards,
 *     and more), each mapped to the institution that hosts or administers
 *     it, with future deadlines and realistic funding figures.
 *   - 3 applications for Alice with mixed statuses.
 *   - 5 reviews (ratings 3-5) spread across multiple scholarships.
 *   - 4 bookmarks split between Alice and Bob.
 *   - 3 notifications for Alice (one per `NotificationType`).
 *   - 1 `PlatformSettings` row pinned to `id="singleton"`.
 *
 * The script is idempotent: every record is created via `upsert` keyed on
 * the natural unique constraint (email, composite unique, or explicit id)
 * so re-running it leaves the database in the same logical state.
 *
 * The scholarship facts (coverage, host institution, category, links) are
 * drawn from the programs' public official pages. Funding figures are
 * approximate USD equivalents for display and deadlines are hard-coded to
 * fixed future dates to keep the seed deterministic — always confirm the
 * live figures/deadlines on each program's official site before relying
 * on them.
 *
 * Default password for every seeded user is `Password123!`, hashed via
 * Better Auth's password context (`(await auth.$context).password.hash`).
 *
 * Validates: Requirements 4.3, 4.5, 16.4.
 */

import "dotenv/config";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const DEFAULT_PASSWORD = "Password123!";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Upsert a user keyed on email and ensure they have a Better Auth credential
 * `Account` row with the supplied hashed password. The `Account` row is keyed
 * on the (providerId, accountId) composite unique so the operation is
 * idempotent across reruns.
 */
async function upsertUserWithCredential(params: {
  email: string;
  name: string;
  role: "ADMIN" | "MODERATOR" | "USER";
  hashedPassword: string;
  country?: string;
  city?: string;
  educationalLevel?: string;
  major?: string;
}) {
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: {
      name: params.name,
      role: params.role,
      country: params.country,
      city: params.city,
      educationalLevel: params.educationalLevel,
      major: params.major,
    },
    create: {
      email: params.email,
      name: params.name,
      role: params.role,
      emailVerified: true,
      country: params.country,
      city: params.city,
      educationalLevel: params.educationalLevel,
      major: params.major,
    },
  });

  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: user.id,
      },
    },
    update: {
      password: params.hashedPassword,
      userId: user.id,
    },
    create: {
      id: `acct_credential_${user.id}`,
      providerId: "credential",
      accountId: user.id,
      userId: user.id,
      password: params.hashedPassword,
    },
  });

  return user;
}

/** Coerce a `YYYY-MM-DD` string to an end-of-day UTC Date (deterministic). */
const d = (yyyyMmDd: string) => new Date(`${yyyyMmDd}T23:59:59.000Z`);

// ---------------------------------------------------------------------------
// Seed routine
// ---------------------------------------------------------------------------

async function main() {
  // Hash the default password once via Better Auth's context so every seeded
  // credential account uses the same canonical hash format the runtime sign-in
  // path expects.
  const hashedPassword = await (await auth.$context).password.hash(
    DEFAULT_PASSWORD
  );

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  const admin = await upsertUserWithCredential({
    email: "admin@scholarvista.com",
    name: "Admin User",
    role: "ADMIN",
    hashedPassword,
    country: "United States",
    city: "Cambridge",
  });

  const moderator = await upsertUserWithCredential({
    email: "moderator@scholarvista.com",
    name: "Moderator User",
    role: "MODERATOR",
    hashedPassword,
    country: "United Kingdom",
    city: "Oxford",
  });

  const alice = await upsertUserWithCredential({
    email: "alice@example.com",
    name: "Alice Johnson",
    role: "USER",
    hashedPassword,
    country: "United States",
    city: "Boston",
    educationalLevel: "Bachelor",
    major: "Computer Science",
  });

  const bob = await upsertUserWithCredential({
    email: "bob@example.com",
    name: "Bob Smith",
    role: "USER",
    hashedPassword,
    country: "Canada",
    city: "Toronto",
    educationalLevel: "Master",
    major: "Mechanical Engineering",
  });

  const carol = await upsertUserWithCredential({
    email: "carol@example.com",
    name: "Carol Davis",
    role: "USER",
    hashedPassword,
    country: "Germany",
    city: "Berlin",
    educationalLevel: "Bachelor",
    major: "Economics",
  });

  // -------------------------------------------------------------------------
  // Universities (20 real institutions across 15 countries)
  // -------------------------------------------------------------------------
  const universitySeeds = [
    {
      id: "univ-mit",
      name: "Massachusetts Institute of Technology",
      logo: "https://picsum.photos/seed/mit/200/200",
      contactEmail: "admissions@mit.edu",
      website: "https://www.mit.edu",
      description:
        "A private research university in Cambridge, Massachusetts, world-renowned for engineering, computer science, and the physical sciences.",
      address: "77 Massachusetts Ave",
      country: "United States",
      city: "Cambridge",
      worldRank: 1,
      type: "PRIVATE" as const,
      establishedYear: 1861,
      isPartner: true,
    },
    {
      id: "univ-oxford",
      name: "University of Oxford",
      logo: "https://picsum.photos/seed/oxford/200/200",
      contactEmail: "admissions@ox.ac.uk",
      website: "https://www.ox.ac.uk",
      description:
        "A collegiate research university in Oxford and the oldest university in the English-speaking world, host to the Rhodes and Clarendon scholarships.",
      address: "University Offices, Wellington Square",
      country: "United Kingdom",
      city: "Oxford",
      worldRank: 3,
      type: "PUBLIC" as const,
      establishedYear: 1096,
      isPartner: false,
    },
    {
      id: "univ-harvard",
      name: "Harvard University",
      logo: "https://picsum.photos/seed/harvard/200/200",
      contactEmail: "admissions@harvard.edu",
      website: "https://www.harvard.edu",
      description:
        "A private Ivy League research university in Cambridge, Massachusetts, with one of the broadest fellowship portfolios in the world.",
      address: "Massachusetts Hall",
      country: "United States",
      city: "Cambridge",
      worldRank: 4,
      type: "PRIVATE" as const,
      establishedYear: 1636,
      isPartner: false,
    },
    {
      id: "univ-cambridge",
      name: "University of Cambridge",
      logo: "https://picsum.photos/seed/cambridge/200/200",
      contactEmail: "admissions@cam.ac.uk",
      website: "https://www.cam.ac.uk",
      description:
        "A collegiate public research university in Cambridge, England, home to the Gates Cambridge Scholarship for outstanding international postgraduates.",
      address: "The Old Schools, Trinity Lane",
      country: "United Kingdom",
      city: "Cambridge",
      worldRank: 5,
      type: "PUBLIC" as const,
      establishedYear: 1209,
      isPartner: false,
    },
    {
      id: "univ-stanford",
      name: "Stanford University",
      logo: "https://picsum.photos/seed/stanford/200/200",
      contactEmail: "admission@stanford.edu",
      website: "https://www.stanford.edu",
      description:
        "A private research university in Silicon Valley known for entrepreneurship, and home to the Knight-Hennessy Scholars graduate program.",
      address: "450 Jane Stanford Way",
      country: "United States",
      city: "Stanford",
      worldRank: 6,
      type: "PRIVATE" as const,
      establishedYear: 1885,
      isPartner: false,
    },
    {
      id: "univ-ethz",
      name: "ETH Zurich",
      logo: "https://picsum.photos/seed/ethz/200/200",
      contactEmail: "admissions@ethz.ch",
      website: "https://ethz.ch",
      description:
        "A public science and technology university in Zurich, Switzerland, offering the ETH Excellence Scholarship for master's students.",
      address: "Ramistrasse 101",
      country: "Switzerland",
      city: "Zurich",
      worldRank: 7,
      type: "PUBLIC" as const,
      establishedYear: 1855,
      isPartner: false,
    },
    {
      id: "univ-nus",
      name: "National University of Singapore",
      logo: "https://picsum.photos/seed/nus/200/200",
      contactEmail: "admissions@nus.edu.sg",
      website: "https://www.nus.edu.sg",
      description:
        "Singapore's flagship public research university, offering the NUS Global Merit Scholarship and a wide student exchange network.",
      address: "21 Lower Kent Ridge Rd",
      country: "Singapore",
      city: "Singapore",
      worldRank: 8,
      type: "PUBLIC" as const,
      establishedYear: 1905,
      isPartner: true,
    },
    {
      id: "univ-melbourne",
      name: "University of Melbourne",
      logo: "https://picsum.photos/seed/melbourne/200/200",
      contactEmail: "admissions@unimelb.edu.au",
      website: "https://www.unimelb.edu.au",
      description:
        "A leading public research university in Melbourne and a delivery partner for the Australia Awards Scholarships program.",
      address: "Grattan Street, Parkville",
      country: "Australia",
      city: "Melbourne",
      worldRank: 13,
      type: "PUBLIC" as const,
      establishedYear: 1853,
      isPartner: true,
    },
    {
      id: "univ-tsinghua",
      name: "Tsinghua University",
      logo: "https://picsum.photos/seed/tsinghua/200/200",
      contactEmail: "admissions@tsinghua.edu.cn",
      website: "https://www.tsinghua.edu.cn",
      description:
        "A leading public research university in Beijing that hosts the Schwarzman Scholars master's program and the Chinese Government Scholarship.",
      address: "30 Shuangqing Rd, Haidian District",
      country: "China",
      city: "Beijing",
      worldRank: 20,
      type: "PUBLIC" as const,
      establishedYear: 1911,
      isPartner: false,
    },
    {
      id: "univ-toronto",
      name: "University of Toronto",
      logo: "https://picsum.photos/seed/toronto/200/200",
      contactEmail: "admissions@utoronto.ca",
      website: "https://www.utoronto.ca",
      description:
        "Canada's top public research university, offering the prestigious Lester B. Pearson International Scholarship to undergraduates.",
      address: "27 King's College Circle",
      country: "Canada",
      city: "Toronto",
      worldRank: 25,
      type: "PUBLIC" as const,
      establishedYear: 1827,
      isPartner: true,
    },
    {
      id: "univ-tum",
      name: "Technical University of Munich",
      logo: "https://picsum.photos/seed/tum/200/200",
      contactEmail: "admissions@tum.de",
      website: "https://www.tum.de",
      description:
        "A public research university in Munich strong in engineering and the natural sciences, a frequent DAAD scholarship destination.",
      address: "Arcisstrasse 21",
      country: "Germany",
      city: "Munich",
      worldRank: 28,
      type: "PUBLIC" as const,
      establishedYear: 1868,
      isPartner: false,
    },
    {
      id: "univ-anu",
      name: "Australian National University",
      logo: "https://picsum.photos/seed/anu/200/200",
      contactEmail: "admissions@anu.edu.au",
      website: "https://www.anu.edu.au",
      description:
        "A national public research university in Canberra offering the ANU Chancellor's International Scholarship for high-achieving students.",
      address: "Acton ACT 2601",
      country: "Australia",
      city: "Canberra",
      worldRank: 30,
      type: "PUBLIC" as const,
      establishedYear: 1946,
      isPartner: false,
    },
    {
      id: "univ-snu",
      name: "Seoul National University",
      logo: "https://picsum.photos/seed/snu/200/200",
      contactEmail: "admissions@snu.ac.kr",
      website: "https://www.snu.ac.kr",
      description:
        "South Korea's leading national university in Seoul and a major host for the Global Korea Scholarship (GKS).",
      address: "1 Gwanak-ro, Gwanak-gu",
      country: "South Korea",
      city: "Seoul",
      worldRank: 31,
      type: "PUBLIC" as const,
      establishedYear: 1946,
      isPartner: false,
    },
    {
      id: "univ-tokyo",
      name: "University of Tokyo",
      logo: "https://picsum.photos/seed/tokyo/200/200",
      contactEmail: "admissions@u-tokyo.ac.jp",
      website: "https://www.u-tokyo.ac.jp",
      description:
        "Japan's most prestigious public research university and a primary destination for MEXT and JSPS fellowship recipients.",
      address: "7-3-1 Hongo, Bunkyo-ku",
      country: "Japan",
      city: "Tokyo",
      worldRank: 32,
      type: "PUBLIC" as const,
      establishedYear: 1877,
      isPartner: false,
    },
    {
      id: "univ-heidelberg",
      name: "Heidelberg University",
      logo: "https://picsum.photos/seed/heidelberg/200/200",
      contactEmail: "admissions@uni-heidelberg.de",
      website: "https://www.uni-heidelberg.de",
      description:
        "Germany's oldest university and a public research institution strong in the life sciences and humanities, a host for Humboldt fellows.",
      address: "Grabengasse 1",
      country: "Germany",
      city: "Heidelberg",
      worldRank: 47,
      type: "PUBLIC" as const,
      establishedYear: 1386,
      isPartner: false,
    },
    {
      id: "univ-leiden",
      name: "Leiden University",
      logo: "https://picsum.photos/seed/leiden/200/200",
      contactEmail: "admissions@leidenuniv.nl",
      website: "https://www.universiteitleiden.nl",
      description:
        "The oldest university in the Netherlands, offering the Holland Scholarship and Orange Tulip awards to international students.",
      address: "Rapenburg 70",
      country: "Netherlands",
      city: "Leiden",
      worldRank: 58,
      type: "PUBLIC" as const,
      establishedYear: 1575,
      isPartner: false,
    },
    {
      id: "univ-kuleuven",
      name: "KU Leuven",
      logo: "https://picsum.photos/seed/kuleuven/200/200",
      contactEmail: "admissions@kuleuven.be",
      website: "https://www.kuleuven.be",
      description:
        "Belgium's highest-ranked university and a leading coordinator of Erasmus Mundus joint master's programs.",
      address: "Oude Markt 13",
      country: "Belgium",
      city: "Leuven",
      worldRank: 61,
      type: "PUBLIC" as const,
      establishedYear: 1425,
      isPartner: true,
    },
    {
      id: "univ-auckland",
      name: "University of Auckland",
      logo: "https://picsum.photos/seed/auckland/200/200",
      contactEmail: "admissions@auckland.ac.nz",
      website: "https://www.auckland.ac.nz",
      description:
        "New Zealand's largest and highest-ranked university, offering the International Student Excellence Scholarship.",
      address: "22 Princes Street",
      country: "New Zealand",
      city: "Auckland",
      worldRank: 65,
      type: "PUBLIC" as const,
      establishedYear: 1883,
      isPartner: false,
    },
    {
      id: "univ-sciencespo",
      name: "Sciences Po",
      logo: "https://picsum.photos/seed/sciencespo/200/200",
      contactEmail: "admissions@sciencespo.fr",
      website: "https://www.sciencespo.fr",
      description:
        "A selective French university in Paris specializing in the social sciences and a common destination for Eiffel Excellence scholars.",
      address: "27 Rue Saint-Guillaume",
      country: "France",
      city: "Paris",
      worldRank: 150,
      type: "PUBLIC" as const,
      establishedYear: 1872,
      isPartner: false,
    },
    {
      id: "univ-uct",
      name: "University of Cape Town",
      logo: "https://picsum.photos/seed/uct/200/200",
      contactEmail: "admissions@uct.ac.za",
      website: "https://www.uct.ac.za",
      description:
        "South Africa's oldest university and the highest ranked in Africa, home to the Mandela Rhodes Scholarship community.",
      address: "Rondebosch",
      country: "South Africa",
      city: "Cape Town",
      worldRank: 171,
      type: "PUBLIC" as const,
      establishedYear: 1829,
      isPartner: false,
    },
  ];

  for (const u of universitySeeds) {
    await prisma.university.upsert({
      where: { id: u.id },
      update: {
        name: u.name,
        logo: u.logo,
        contactEmail: u.contactEmail,
        website: u.website,
        description: u.description,
        address: u.address,
        country: u.country,
        city: u.city,
        worldRank: u.worldRank,
        type: u.type,
        establishedYear: u.establishedYear,
        isPartner: u.isPartner,
        acceptingApplications: true,
      },
      create: {
        id: u.id,
        name: u.name,
        logo: u.logo,
        contactEmail: u.contactEmail,
        website: u.website,
        description: u.description,
        address: u.address,
        country: u.country,
        city: u.city,
        worldRank: u.worldRank,
        type: u.type,
        establishedYear: u.establishedYear,
        isPartner: u.isPartner,
        acceptingApplications: true,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Scholarships (37 real programs across all six categories)
  // -------------------------------------------------------------------------
  // Funding figures are approximate USD equivalents for display; deadlines
  // are hard-coded future dates for deterministic seeding. All rows are
  // pre-approved so they surface in the public catalog immediately.
  const scholarshipSeeds: Array<{
    id: string;
    title: string;
    universityId: string;
    category:
      | "UNDERGRADUATE"
      | "MASTERS"
      | "PHD"
      | "POSTDOC"
      | "EXCHANGE"
      | "SHORT_COURSE";
    subject: string;
    description: string;
    stipend: number;
    coverage: string;
    location: string;
    requirements: string;
    deadline: Date;
    applicationLink: string;
    fees: number;
  }> = [
    // ---------------------- UNDERGRADUATE ----------------------
    {
      id: "sch-pearson-toronto",
      title: "Lester B. Pearson International Scholarship",
      universityId: "univ-toronto",
      category: "UNDERGRADUATE",
      subject: "Open to all disciplines",
      description:
        "The University of Toronto's flagship award recognizes exceptional international students who demonstrate creativity and impact as leaders within their school and community. It is among the most competitive undergraduate scholarships in Canada.",
      stipend: 20000,
      coverage: "Full tuition, books, incidental fees, and residence for four years",
      location: "Toronto, Canada",
      requirements:
        "International student in final year of secondary school or graduated no earlier than the previous year, nominated by their school, with outstanding academic achievement and demonstrated leadership.",
      deadline: d("2026-11-30"),
      applicationLink: "https://future.utoronto.ca/pearson/",
      fees: 0,
    },
    {
      id: "sch-melbourne-undergrad",
      title: "Melbourne International Undergraduate Scholarship",
      universityId: "univ-melbourne",
      category: "UNDERGRADUATE",
      subject: "Open to all undergraduate disciplines",
      description:
        "Awarded automatically to high-achieving international students commencing an undergraduate degree at the University of Melbourne, recognizing academic excellence at the point of admission.",
      stipend: 10000,
      coverage: "Tuition fee remission ranging from partial to full over the degree",
      location: "Melbourne, Australia",
      requirements:
        "International applicant with an outstanding academic record applying for a bachelor's degree; considered automatically on admission, no separate application required.",
      deadline: d("2026-10-31"),
      applicationLink:
        "https://scholarships.unimelb.edu.au/awards/melbourne-international-undergraduate-scholarship",
      fees: 0,
    },
    {
      id: "sch-mext-undergrad",
      title: "MEXT Undergraduate Scholarship (Japanese Government)",
      universityId: "univ-tokyo",
      category: "UNDERGRADUATE",
      subject: "Social Sciences, Humanities, or Natural Sciences",
      description:
        "A Japanese Government (MEXT) scholarship offered in principle for five years, including one year of preparatory Japanese-language and subject study before entering an undergraduate program at a Japanese university.",
      stipend: 8400,
      coverage: "Full tuition, monthly living stipend, and round-trip airfare to Japan",
      location: "Tokyo, Japan",
      requirements:
        "International applicant meeting the age limit, strong secondary-school record, and willingness to study Japanese; applications are made through a Japanese embassy or partner university.",
      deadline: d("2027-05-31"),
      applicationLink:
        "https://www.studyinjapan.go.jp/en/planning/scholarship/",
      fees: 0,
    },
    {
      id: "sch-nus-global-merit",
      title: "NUS Global Merit Scholarship",
      universityId: "univ-nus",
      category: "UNDERGRADUATE",
      subject: "Open to all undergraduate disciplines",
      description:
        "A merit-based award for outstanding undergraduates at the National University of Singapore, providing an annual living allowance plus opportunities for a student exchange programme abroad.",
      stipend: 6000,
      coverage: "Annual living allowance plus a one-off computer and exchange grant",
      location: "Singapore",
      requirements:
        "Strong academic results, leadership potential, and active co-curricular involvement; awarded on a competitive basis to admitted undergraduates.",
      deadline: d("2027-03-15"),
      applicationLink:
        "https://www.nus.edu.sg/oam/scholarships/freshmen-scholarships-(international-students)",
      fees: 0,
    },
    {
      id: "sch-holland",
      title: "Holland Scholarship",
      universityId: "univ-leiden",
      category: "UNDERGRADUATE",
      subject: "Open to most bachelor's and master's disciplines",
      description:
        "Funded by the Dutch Ministry of Education and participating universities, the Holland Scholarship supports international students from outside the European Economic Area beginning their studies in the Netherlands.",
      stipend: 5800,
      coverage: "One-time award of 5,000 EUR paid in the first year of study",
      location: "Leiden, Netherlands",
      requirements:
        "Non-EEA international student, first-time enrolment in a Dutch bachelor's or master's program, meeting the host institution's admission criteria.",
      deadline: d("2027-02-01"),
      applicationLink: "https://www.studyinnl.org/finances/holland-scholarship",
      fees: 0,
    },
    {
      id: "sch-anu-chancellor",
      title: "ANU Chancellor's International Scholarship",
      universityId: "univ-anu",
      category: "UNDERGRADUATE",
      subject: "Open to all undergraduate disciplines",
      description:
        "A merit scholarship from the Australian National University offering a tuition reduction to high-achieving international undergraduate students commencing a bachelor's degree in Canberra.",
      stipend: 9000,
      coverage: "Partial tuition remission applied across the degree",
      location: "Canberra, Australia",
      requirements:
        "International undergraduate applicant with an excellent academic record; assessed automatically on the strength of the admission application.",
      deadline: d("2026-12-15"),
      applicationLink:
        "https://study.anu.edu.au/scholarships/find-scholarship/anu-chancellors-international-scholarship",
      fees: 0,
    },
    {
      id: "sch-gks-undergrad",
      title: "Global Korea Scholarship (Undergraduate)",
      universityId: "univ-snu",
      category: "UNDERGRADUATE",
      subject: "Open to all undergraduate disciplines",
      description:
        "The Global Korea Scholarship, administered by NIIED, invites international students to pursue undergraduate degrees in South Korea, including a year of Korean-language training before the degree begins.",
      stipend: 9600,
      coverage: "Full tuition, airfare, monthly allowance, and a Korean-language course",
      location: "Seoul, South Korea",
      requirements:
        "International applicant under the age limit with strong grades; applies via a Korean embassy or a designated university track.",
      deadline: d("2027-09-30"),
      applicationLink: "https://www.studyinkorea.go.kr",
      fees: 0,
    },
    {
      id: "sch-auckland-excellence",
      title: "University of Auckland International Student Excellence Scholarship",
      universityId: "univ-auckland",
      category: "UNDERGRADUATE",
      subject: "Open to all undergraduate disciplines",
      description:
        "A merit award recognizing outstanding international students beginning their first undergraduate qualification at New Zealand's top-ranked university.",
      stipend: 6500,
      coverage: "One-off award of up to 10,000 NZD toward tuition",
      location: "Auckland, New Zealand",
      requirements:
        "International student commencing a first bachelor's degree with an exceptional academic record; competitive selection.",
      deadline: d("2027-01-15"),
      applicationLink:
        "https://www.auckland.ac.nz/en/study/scholarships-and-awards.html",
      fees: 0,
    },

    // ---------------------------- MASTERS ----------------------------
    {
      id: "sch-chevening",
      title: "Chevening Scholarship",
      universityId: "univ-cambridge",
      category: "MASTERS",
      subject: "Open to any one-year master's discipline",
      description:
        "The UK government's flagship international scholarship, funded by the Foreign, Commonwealth & Development Office, enabling emerging leaders from around the world to pursue a one-year master's degree at any UK university.",
      stipend: 22000,
      coverage: "Full tuition, monthly living stipend, travel, and arrival allowances",
      location: "United Kingdom",
      requirements:
        "Citizen of an eligible Chevening country, an undergraduate degree, at least two years of work experience, and an offer for an eligible UK master's course.",
      deadline: d("2026-11-05"),
      applicationLink: "https://www.chevening.org/apply/",
      fees: 0,
    },
    {
      id: "sch-rhodes",
      title: "Rhodes Scholarship",
      universityId: "univ-oxford",
      category: "MASTERS",
      subject: "Open to most postgraduate disciplines",
      description:
        "Established in 1903, the Rhodes Scholarship is the world's oldest international scholarship program, bringing exceptional young leaders from many countries to pursue postgraduate study at the University of Oxford.",
      stipend: 24000,
      coverage: "Full university and college fees plus an annual living stipend",
      location: "Oxford, United Kingdom",
      requirements:
        "Citizen of an eligible constituency, within the age limits, holding a strong undergraduate degree, with proven leadership and commitment to service.",
      deadline: d("2026-10-01"),
      applicationLink: "https://www.rhodeshouse.ox.ac.uk/scholarships/",
      fees: 0,
    },
    {
      id: "sch-clarendon",
      title: "Clarendon Fund Scholarship",
      universityId: "univ-oxford",
      category: "MASTERS",
      subject: "Open to all graduate disciplines",
      description:
        "Oxford's largest graduate scholarship scheme offers awards to academically outstanding graduate students across every field of study, selected on the basis of academic merit and future potential.",
      stipend: 20000,
      coverage: "Full course fees and a generous annual grant for living costs",
      location: "Oxford, United Kingdom",
      requirements:
        "Applicant for a full-time graduate course at Oxford with an outstanding academic record; considered automatically on the graduate application.",
      deadline: d("2027-01-10"),
      applicationLink: "https://www.ox.ac.uk/clarendon",
      fees: 0,
    },
    {
      id: "sch-knight-hennessy",
      title: "Knight-Hennessy Scholars",
      universityId: "univ-stanford",
      category: "MASTERS",
      subject: "Open to all Stanford graduate programs",
      description:
        "A fully funded graduate fellowship at Stanford that develops a multidisciplinary community of purpose-driven leaders and pairs funding with a dedicated leadership development program.",
      stipend: 45000,
      coverage: "Tuition, living and academic stipend, and travel allowance",
      location: "Stanford, United States",
      requirements:
        "Applicant admitted to a full-time Stanford graduate degree, with a bachelor's earned within the eligibility window and demonstrated leadership.",
      deadline: d("2026-10-08"),
      applicationLink: "https://knight-hennessy.stanford.edu/",
      fees: 0,
    },
    {
      id: "sch-fulbright-foreign",
      title: "Fulbright Foreign Student Program",
      universityId: "univ-harvard",
      category: "MASTERS",
      subject: "Open to most graduate disciplines",
      description:
        "The U.S. government's flagship international exchange program enables graduate students from over 150 countries to pursue a master's or doctoral degree at a U.S. university.",
      stipend: 28000,
      coverage: "Tuition, living stipend, airfare, and health benefits",
      location: "United States",
      requirements:
        "Citizen of a participating country, an undergraduate degree, and strong academic and leadership record; applications are made through the local Fulbright commission or U.S. embassy.",
      deadline: d("2027-02-28"),
      applicationLink: "https://foreign.fulbrightonline.org/",
      fees: 0,
    },
    {
      id: "sch-daad-masters",
      title: "DAAD Study Scholarship for Master's Studies",
      universityId: "univ-heidelberg",
      category: "MASTERS",
      subject: "Open to most master's disciplines",
      description:
        "The German Academic Exchange Service (DAAD) funds international graduates to complete a full master's degree in Germany, supporting a broad range of subjects at German universities.",
      stipend: 13000,
      coverage: "Monthly stipend, health insurance, travel, and study allowance",
      location: "Germany",
      requirements:
        "International graduate with a first degree completed no more than six years ago and admission to an eligible German master's program.",
      deadline: d("2026-10-15"),
      applicationLink: "https://www.daad.de/en/study-and-research-in-germany/scholarships/",
      fees: 0,
    },
    {
      id: "sch-erasmus-mundus",
      title: "Erasmus Mundus Joint Master's Scholarship",
      universityId: "univ-kuleuven",
      category: "MASTERS",
      subject: "Open to selected joint master's programs",
      description:
        "Funded by the European Union, Erasmus Mundus supports students on prestigious joint master's degrees delivered by consortia of universities across multiple European countries.",
      stipend: 16000,
      coverage: "Tuition, monthly living allowance, travel, and installation costs",
      location: "European Union (multiple countries)",
      requirements:
        "Holder of a first higher-education degree admitted to an eligible Erasmus Mundus joint master's program; applications go directly to the program consortium.",
      deadline: d("2027-01-15"),
      applicationLink:
        "https://www.eacea.ec.europa.eu/scholarships/emjmd-catalogue_en",
      fees: 0,
    },
    {
      id: "sch-schwarzman",
      title: "Schwarzman Scholars Program",
      universityId: "univ-tsinghua",
      category: "MASTERS",
      subject: "Master's in Global Affairs",
      description:
        "A one-year, fully funded master's program at Tsinghua University in Beijing designed to prepare the next generation of global leaders through a residential cohort and deep engagement with China.",
      stipend: 30000,
      coverage: "Tuition, accommodation, travel, study materials, health insurance, and stipend",
      location: "Beijing, China",
      requirements:
        "Undergraduate degree, aged 18-28, English proficiency, and demonstrated leadership; open to applicants of any nationality.",
      deadline: d("2026-09-30"),
      applicationLink: "https://www.schwarzmanscholars.org/",
      fees: 0,
    },
    {
      id: "sch-csc-masters",
      title: "Chinese Government Scholarship (CSC)",
      universityId: "univ-tsinghua",
      category: "MASTERS",
      subject: "Open to most master's disciplines",
      description:
        "Administered by the China Scholarship Council, this award supports international students undertaking master's studies at leading Chinese universities across a wide range of fields.",
      stipend: 7000,
      coverage: "Full tuition, on-campus accommodation, and a monthly living allowance",
      location: "Beijing, China",
      requirements:
        "International applicant meeting the age and academic criteria with admission to a Chinese host university; applies through an embassy or the university channel.",
      deadline: d("2027-03-31"),
      applicationLink: "https://www.campuschina.org/",
      fees: 0,
    },
    {
      id: "sch-australia-awards",
      title: "Australia Awards Scholarships",
      universityId: "univ-melbourne",
      category: "MASTERS",
      subject: "Development-focused disciplines",
      description:
        "Long-term development scholarships funded by the Australian Government's foreign affairs program, enabling students from partner countries to undertake postgraduate study at Australian institutions.",
      stipend: 21000,
      coverage: "Full tuition, return airfare, living allowance, and health cover",
      location: "Melbourne, Australia",
      requirements:
        "Citizen of a participating partner country, meeting the program's development and eligibility criteria, with a commitment to return home after study.",
      deadline: d("2027-04-30"),
      applicationLink: "https://www.dfat.gov.au/people-to-people/australia-awards",
      fees: 0,
    },
    {
      id: "sch-eth-excellence",
      title: "ETH Excellence Scholarship (ESOP)",
      universityId: "univ-ethz",
      category: "MASTERS",
      subject: "Open to most master's disciplines",
      description:
        "The ETH Zurich Excellence Scholarship and Opportunity Programme funds outstanding students pursuing a master's degree, pairing financial support with a research-oriented environment.",
      stipend: 14000,
      coverage: "Living and study costs plus a tuition-fee waiver for the master's degree",
      location: "Zurich, Switzerland",
      requirements:
        "Excellent academic record, admission to an ETH Zurich master's program, and a strong research statement; highly competitive selection.",
      deadline: d("2026-12-15"),
      applicationLink:
        "https://ethz.ch/en/studies/financial/scholarships/excellencescholarship.html",
      fees: 0,
    },
    {
      id: "sch-eiffel",
      title: "Eiffel Excellence Scholarship Program",
      universityId: "univ-sciencespo",
      category: "MASTERS",
      subject: "Law, Economics, Engineering, Political Science",
      description:
        "Funded by the French Ministry for Europe and Foreign Affairs, the Eiffel program helps French institutions attract top international students to master's and doctoral programs.",
      stipend: 15000,
      coverage: "Monthly allowance, international travel, health insurance, and cultural activities",
      location: "Paris, France",
      requirements:
        "International student nominated by the host French institution, within the age limit, in a priority field of study.",
      deadline: d("2027-01-09"),
      applicationLink: "https://www.campusfrance.org/en/eiffel-scholarship-program-of-excellence",
      fees: 0,
    },
    {
      id: "sch-orange-tulip",
      title: "Orange Tulip Scholarship",
      universityId: "univ-leiden",
      category: "MASTERS",
      subject: "Open to selected master's disciplines",
      description:
        "A scholarship program run by the Dutch education organization Nuffic that helps talented students from selected countries fund a master's degree in the Netherlands.",
      stipend: 12000,
      coverage: "Partial to full tuition depending on the participating institution",
      location: "Leiden, Netherlands",
      requirements:
        "Citizen of an eligible country, admitted to a participating Dutch master's program, meeting country-specific criteria.",
      deadline: d("2027-04-01"),
      applicationLink: "https://www.nuffic.nl/en/subjects/orange-tulip-scholarship",
      fees: 0,
    },
    {
      id: "sch-mandela-rhodes",
      title: "Mandela Rhodes Scholarship",
      universityId: "univ-uct",
      category: "MASTERS",
      subject: "Open to postgraduate disciplines in South Africa",
      description:
        "A leadership scholarship for young Africans pursuing postgraduate study at South African universities, combining funding with a structured leadership development program.",
      stipend: 11000,
      coverage: "Tuition, accommodation, meals, a study allowance, and leadership training",
      location: "Cape Town, South Africa",
      requirements:
        "African national under the age limit with a strong academic record and demonstrated leadership, undertaking postgraduate study in South Africa.",
      deadline: d("2027-04-15"),
      applicationLink: "https://www.mandelarhodes.org/",
      fees: 0,
    },

    // ------------------------------ PHD ------------------------------
    {
      id: "sch-gates-cambridge",
      title: "Gates Cambridge Scholarship",
      universityId: "univ-cambridge",
      category: "PHD",
      subject: "Open to most doctoral disciplines",
      description:
        "One of the most prestigious international scholarships, funding outstanding non-UK students to pursue a full-time postgraduate degree at the University of Cambridge, with a focus on academic excellence and social commitment.",
      stipend: 40000,
      coverage: "Full cost of study at Cambridge plus discretionary family and travel funding",
      location: "Cambridge, United Kingdom",
      requirements:
        "Non-UK citizen applying for a full-time PhD, MLitt, or eligible one-year postgraduate course, with an outstanding academic record and clear reasons for choosing Cambridge.",
      deadline: d("2026-12-03"),
      applicationLink: "https://www.gatescambridge.org/apply/",
      fees: 0,
    },
    {
      id: "sch-commonwealth-phd",
      title: "Commonwealth PhD Scholarship",
      universityId: "univ-cambridge",
      category: "PHD",
      subject: "Development-related doctoral research",
      description:
        "Funded by the UK's Foreign, Commonwealth & Development Office, these scholarships enable talented candidates from low- and middle-income Commonwealth countries to undertake doctoral study in the UK.",
      stipend: 26000,
      coverage: "Full tuition, airfare, and a monthly living stipend",
      location: "United Kingdom",
      requirements:
        "Citizen of an eligible Commonwealth country, a relevant master's or strong bachelor's degree, and inability to self-fund UK study.",
      deadline: d("2026-10-18"),
      applicationLink: "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-phd-scholarships/",
      fees: 0,
    },
    {
      id: "sch-daad-doctoral",
      title: "DAAD Research Grant for Doctoral Candidates",
      universityId: "univ-tum",
      category: "PHD",
      subject: "Open to most doctoral disciplines",
      description:
        "The DAAD funds international doctoral candidates to complete their research or full PhD in Germany, supporting a wide range of subjects at German universities and research institutes.",
      stipend: 15600,
      coverage: "Monthly doctoral stipend, health insurance, travel, and research allowance",
      location: "Munich, Germany",
      requirements:
        "International graduate with an excellent master's degree completed within the eligibility window and a confirmed doctoral supervisor in Germany.",
      deadline: d("2026-11-15"),
      applicationLink: "https://www.daad.de/en/study-and-research-in-germany/scholarships/",
      fees: 0,
    },
    {
      id: "sch-swiss-excellence",
      title: "Swiss Government Excellence Scholarship",
      universityId: "univ-ethz",
      category: "PHD",
      subject: "Open to doctoral and research disciplines",
      description:
        "Offered by the Swiss Confederation to promote international research exchange, this scholarship funds foreign doctoral and postdoctoral researchers at Swiss public universities and institutes.",
      stipend: 20000,
      coverage: "Monthly stipend, tuition waiver, health insurance, and travel allowance",
      location: "Zurich, Switzerland",
      requirements:
        "International researcher with a relevant master's or doctoral degree and a supervisor at a Swiss host institution; applies via the Swiss embassy in their home country.",
      deadline: d("2026-11-30"),
      applicationLink:
        "https://www.sbfi.admin.ch/sbfi/en/home/education/scholarships-and-grants/swiss-government-excellence-scholarships.html",
      fees: 0,
    },
    {
      id: "sch-mext-research",
      title: "MEXT Research Scholarship (Doctoral)",
      universityId: "univ-tokyo",
      category: "PHD",
      subject: "Open to most doctoral research disciplines",
      description:
        "A Japanese Government scholarship for international research and doctoral students, covering study at a Japanese graduate school with optional Japanese-language preparation.",
      stipend: 11500,
      coverage: "Full tuition, monthly stipend, and round-trip airfare to Japan",
      location: "Tokyo, Japan",
      requirements:
        "International graduate with a strong master's record, a research plan, and typically a prospective supervisor; applies through an embassy or university recommendation.",
      deadline: d("2027-05-15"),
      applicationLink:
        "https://www.studyinjapan.go.jp/en/planning/scholarship/",
      fees: 0,
    },
    {
      id: "sch-mit-phd-ai",
      title: "MIT Presidential Fellowship in Artificial Intelligence",
      universityId: "univ-mit",
      category: "PHD",
      subject: "Artificial Intelligence and Computer Science",
      description:
        "A merit-based first-year doctoral fellowship at MIT that supports exceptional incoming PhD students, allowing them to begin their research without immediate teaching or assistantship obligations.",
      stipend: 50000,
      coverage: "Full tuition, stipend, and health insurance for the first year",
      location: "Cambridge, United States",
      requirements:
        "Admitted MIT doctoral student with outstanding academic credentials and a strong research proposal; nominated by the admitting department.",
      deadline: d("2026-12-15"),
      applicationLink: "https://oge.mit.edu/finances/fellowships/",
      fees: 0,
    },

    // ---------------------------- POSTDOC ----------------------------
    {
      id: "sch-humboldt-postdoc",
      title: "Humboldt Research Fellowship for Postdoctoral Researchers",
      universityId: "univ-heidelberg",
      category: "POSTDOC",
      subject: "Open to all research disciplines",
      description:
        "Awarded by the Alexander von Humboldt Foundation, this fellowship enables highly qualified researchers from abroad to carry out long-term research in Germany with a host of their choice.",
      stipend: 36000,
      coverage: "Monthly research fellowship, family and travel allowances, and German-language support",
      location: "Heidelberg, Germany",
      requirements:
        "Doctorate completed within the last four years, an internationally recognized research record, and a confirmed academic host in Germany.",
      deadline: d("2027-03-01"),
      applicationLink: "https://www.humboldt-foundation.de/en/apply/sponsorship-programmes",
      fees: 0,
    },
    {
      id: "sch-harvard-postdoc",
      title: "Harvard Postdoctoral Fellowship in Biomedical Research",
      universityId: "univ-harvard",
      category: "POSTDOC",
      subject: "Biomedical and Life Sciences",
      description:
        "A competitive postdoctoral fellowship supporting early-career researchers pursuing biomedical research within Harvard's laboratories and affiliated institutes.",
      stipend: 62000,
      coverage: "Annual salary, research allowance, and health benefits",
      location: "Cambridge, United States",
      requirements:
        "Recent PhD or MD, a strong publication record, and sponsorship by a Harvard faculty host laboratory.",
      deadline: d("2027-01-31"),
      applicationLink: "https://postdoc.harvard.edu/",
      fees: 0,
    },
    {
      id: "sch-jsps-postdoc",
      title: "JSPS Postdoctoral Fellowship for Research in Japan",
      universityId: "univ-tokyo",
      category: "POSTDOC",
      subject: "Open to all research disciplines",
      description:
        "The Japan Society for the Promotion of Science funds overseas postdoctoral researchers to conduct collaborative research with a host researcher at a Japanese university or institute.",
      stipend: 34000,
      coverage: "Round-trip airfare, monthly maintenance allowance, and a settling-in allowance",
      location: "Tokyo, Japan",
      requirements:
        "Doctorate obtained within the last six years, citizenship of an eligible country, and an invitation from a Japanese host researcher.",
      deadline: d("2027-04-30"),
      applicationLink: "https://www.jsps.go.jp/english/e-fellow/",
      fees: 0,
    },

    // ---------------------------- EXCHANGE ----------------------------
    {
      id: "sch-erasmus-exchange",
      title: "Erasmus+ Student Mobility Grant",
      universityId: "univ-kuleuven",
      category: "EXCHANGE",
      subject: "Open to all disciplines",
      description:
        "The European Union's Erasmus+ program funds students to spend a study period at a partner university in another participating country, earning credit toward their home degree.",
      stipend: 5000,
      coverage: "Monthly mobility grant plus possible top-ups for travel and inclusion",
      location: "European Union (multiple countries)",
      requirements:
        "Enrolled student at a participating institution nominated for an exchange semester at a partner university; applies through the home university's international office.",
      deadline: d("2027-03-01"),
      applicationLink: "https://erasmus-plus.ec.europa.eu/opportunities/individuals/students",
      fees: 0,
    },
    {
      id: "sch-daad-rise",
      title: "DAAD RISE Germany Research Internship",
      universityId: "univ-tum",
      category: "EXCHANGE",
      subject: "STEM research internships",
      description:
        "A summer research internship program matching undergraduate students from abroad with doctoral researchers at German universities and research institutions in the sciences and engineering.",
      stipend: 3200,
      coverage: "Monthly stipend for the internship period plus DAAD support services",
      location: "Munich, Germany",
      requirements:
        "Undergraduate in a STEM field at a university outside Germany, with completed introductory coursework and a strong interest in research.",
      deadline: d("2026-12-15"),
      applicationLink: "https://www.daad.de/rise/en/",
      fees: 0,
    },
    {
      id: "sch-nus-exchange",
      title: "NUS Student Exchange Programme Award",
      universityId: "univ-nus",
      category: "EXCHANGE",
      subject: "Open to all disciplines",
      description:
        "Supports NUS students spending a semester abroad at one of the university's global partner institutions, and inbound exchange students studying at NUS in Singapore.",
      stipend: 4000,
      coverage: "Mobility grant toward travel and living costs during the exchange semester",
      location: "Singapore",
      requirements:
        "Enrolled undergraduate in good academic standing, nominated for a semester exchange with a partner university.",
      deadline: d("2027-02-15"),
      applicationLink: "https://nus.edu.sg/gro/global-programmes/student-exchange",
      fees: 0,
    },

    // -------------------------- SHORT_COURSE --------------------------
    {
      id: "sch-mit-profed",
      title: "MIT Professional Education Short Program Scholarship",
      universityId: "univ-mit",
      category: "SHORT_COURSE",
      subject: "Data Science and Emerging Technologies",
      description:
        "A partial-fee scholarship for MIT Professional Education's intensive short courses, which bring working professionals to campus for focused study in fast-moving technical fields.",
      stipend: 2500,
      coverage: "Partial course-fee reduction for a selected short program",
      location: "Cambridge, United States",
      requirements:
        "Working professional or graduate applicant admitted to an eligible MIT Professional Education short course; awarded on merit and need.",
      deadline: d("2027-06-30"),
      applicationLink: "https://professional.mit.edu/",
      fees: 50,
    },
    {
      id: "sch-oxford-execed",
      title: "Oxford Saïd Executive Education Short Course Bursary",
      universityId: "univ-oxford",
      category: "SHORT_COURSE",
      subject: "Leadership and Management",
      description:
        "A bursary toward the Saïd Business School's open-enrolment executive education short courses, designed for professionals seeking focused leadership and strategy training.",
      stipend: 3000,
      coverage: "Partial reduction of the executive course fee",
      location: "Oxford, United Kingdom",
      requirements:
        "Professional applicant admitted to an eligible Oxford executive education short course, demonstrating leadership potential and need.",
      deadline: d("2027-07-15"),
      applicationLink: "https://www.sbs.ox.ac.uk/programmes/executive-education",
      fees: 40,
    },
    {
      id: "sch-stanford-summer",
      title: "Stanford Summer Session International Scholarship",
      universityId: "univ-stanford",
      category: "SHORT_COURSE",
      subject: "Open to summer session disciplines",
      description:
        "A partial scholarship supporting international students attending Stanford's Summer Session, an on-campus program of intensive undergraduate-level courses.",
      stipend: 2000,
      coverage: "Partial tuition support for the summer term",
      location: "Stanford, United States",
      requirements:
        "International student admitted to Stanford Summer Session with a strong academic record; competitive, need-aware selection.",
      deadline: d("2027-04-01"),
      applicationLink: "https://summer.stanford.edu/",
      fees: 30,
    },
  ];

  for (const s of scholarshipSeeds) {
    await prisma.scholarship.upsert({
      where: { id: s.id },
      update: {
        title: s.title,
        universityId: s.universityId,
        category: s.category,
        subject: s.subject,
        description: s.description,
        stipend: s.stipend,
        coverage: s.coverage,
        location: s.location,
        requirements: s.requirements,
        deadline: s.deadline,
        applicationLink: s.applicationLink,
        fees: s.fees,
        isApproved: true,
        postedById: admin.id,
      },
      create: {
        id: s.id,
        title: s.title,
        universityId: s.universityId,
        category: s.category,
        subject: s.subject,
        description: s.description,
        stipend: s.stipend,
        coverage: s.coverage,
        location: s.location,
        requirements: s.requirements,
        deadline: s.deadline,
        applicationLink: s.applicationLink,
        fees: s.fees,
        image: `https://picsum.photos/seed/${s.id}/600/400`,
        isApproved: true,
        postedById: admin.id,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Applications (3 for Alice with mixed statuses)
  // -------------------------------------------------------------------------
  const applicationSeeds = [
    {
      scholarshipId: "sch-pearson-toronto",
      status: "PENDING" as const,
      paymentStatus: "UNPAID" as const,
    },
    {
      scholarshipId: "sch-chevening",
      status: "PROCESSING" as const,
      paymentStatus: "PAID" as const,
    },
    {
      scholarshipId: "sch-gates-cambridge",
      status: "COMPLETED" as const,
      paymentStatus: "PAID" as const,
    },
  ];

  for (const a of applicationSeeds) {
    await prisma.application.upsert({
      where: {
        userId_scholarshipId: {
          userId: alice.id,
          scholarshipId: a.scholarshipId,
        },
      },
      update: {
        status: a.status,
        paymentStatus: a.paymentStatus,
      },
      create: {
        userId: alice.id,
        scholarshipId: a.scholarshipId,
        applicantName: "Alice Johnson",
        phone: "+1-617-555-0101",
        gender: "FEMALE",
        applyingDegree: "UNDERGRADUATE",
        sscResult: "5.00",
        hscResult: "5.00",
        subjectCategory: "Science",
        village: "Beacon Hill",
        district: "Suffolk",
        country: "United States",
        status: a.status,
        paymentStatus: a.paymentStatus,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Reviews (5 across scholarships, ratings 3-5)
  // -------------------------------------------------------------------------
  const reviewSeeds = [
    {
      userId: alice.id,
      scholarshipId: "sch-pearson-toronto",
      ratingPoint: 5,
      comment:
        "Life-changing award with a transparent, well-supported application process from start to finish.",
    },
    {
      userId: bob.id,
      scholarshipId: "sch-pearson-toronto",
      ratingPoint: 4,
      comment:
        "Extremely generous funding. The nomination step through your school takes some coordination.",
    },
    {
      userId: carol.id,
      scholarshipId: "sch-chevening",
      ratingPoint: 3,
      comment:
        "Prestigious and well-run, though the essays and work-experience requirements are demanding.",
    },
    {
      userId: alice.id,
      scholarshipId: "sch-gates-cambridge",
      ratingPoint: 5,
      comment:
        "The funding, community, and academic support at Cambridge exceeded every expectation.",
    },
    {
      userId: bob.id,
      scholarshipId: "sch-harvard-postdoc",
      ratingPoint: 4,
      comment:
        "Outstanding lab resources and mentorship for early-career biomedical researchers.",
    },
  ];

  for (const r of reviewSeeds) {
    await prisma.review.upsert({
      where: {
        userId_scholarshipId: {
          userId: r.userId,
          scholarshipId: r.scholarshipId,
        },
      },
      update: {
        ratingPoint: r.ratingPoint,
        comment: r.comment,
      },
      create: {
        userId: r.userId,
        scholarshipId: r.scholarshipId,
        ratingPoint: r.ratingPoint,
        comment: r.comment,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Bookmarks (4 split between Alice and Bob)
  // -------------------------------------------------------------------------
  const bookmarkSeeds = [
    { userId: alice.id, scholarshipId: "sch-rhodes" },
    { userId: alice.id, scholarshipId: "sch-fulbright-foreign" },
    { userId: bob.id, scholarshipId: "sch-knight-hennessy" },
    { userId: bob.id, scholarshipId: "sch-daad-doctoral" },
  ];

  for (const b of bookmarkSeeds) {
    await prisma.bookmark.upsert({
      where: {
        userId_scholarshipId: {
          userId: b.userId,
          scholarshipId: b.scholarshipId,
        },
      },
      update: {},
      create: {
        userId: b.userId,
        scholarshipId: b.scholarshipId,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Notifications (3 for Alice, one per type)
  // -------------------------------------------------------------------------
  const notificationSeeds = [
    {
      id: "notif-alice-application-status",
      userId: alice.id,
      type: "APPLICATION_STATUS_CHANGE" as const,
      message:
        "Your application for the Chevening Scholarship is now PROCESSING.",
      relatedEntityId: "sch-chevening",
      isRead: false,
    },
    {
      id: "notif-alice-scholarship-approved",
      userId: alice.id,
      type: "SCHOLARSHIP_APPROVED" as const,
      message:
        "A new scholarship matching your profile has been approved: Gates Cambridge Scholarship.",
      relatedEntityId: "sch-gates-cambridge",
      isRead: false,
    },
    {
      id: "notif-alice-payment-confirmed",
      userId: alice.id,
      type: "PAYMENT_CONFIRMED" as const,
      message:
        "Payment confirmed for your Gates Cambridge Scholarship application.",
      relatedEntityId: "sch-gates-cambridge",
      isRead: true,
    },
  ];

  for (const n of notificationSeeds) {
    await prisma.notification.upsert({
      where: { id: n.id },
      update: {
        message: n.message,
        type: n.type,
        relatedEntityId: n.relatedEntityId,
        isRead: n.isRead,
      },
      create: {
        id: n.id,
        userId: n.userId,
        message: n.message,
        type: n.type,
        relatedEntityId: n.relatedEntityId,
        isRead: n.isRead,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Platform settings (singleton row)
  // -------------------------------------------------------------------------
  await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: {
      platformName: "ScholarVista",
      platformDescription: "Discover, compare, and apply for scholarships",
    },
    create: {
      id: "singleton",
      platformName: "ScholarVista",
      platformDescription: "Discover, compare, and apply for scholarships",
    },
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("✅ Seed complete:");
  console.log("   • Users:            5 (1 ADMIN, 1 MODERATOR, 3 USER)");
  console.log(`     - admin:      ${admin.email}`);
  console.log(`     - moderator:  ${moderator.email}`);
  console.log(`     - users:      ${alice.email}, ${bob.email}, ${carol.email}`);
  console.log("   • Universities:     20 (across 15 countries, 5 partners)");
  console.log("   • Scholarships:     37 approved (all six categories)");
  console.log("   • Applications:     3 (Alice, mixed statuses)");
  console.log("   • Reviews:          5 (ratings 3-5)");
  console.log("   • Bookmarks:        4 (Alice × 2, Bob × 2)");
  console.log("   • Notifications:    3 (Alice, one per type)");
  console.log('   • PlatformSettings: 1 (id="singleton")');
  console.log("   • Default password for all seeded users: " + DEFAULT_PASSWORD);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("❌ Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
