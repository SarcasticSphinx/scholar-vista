-- Raw-SQL CHECK constraints to enforce domain invariants that Prisma's
-- schema language cannot express directly. See requirements 2.3, 2.4, 2.6, 10.1.

-- Review.ratingPoint must be between 1 and 5 (inclusive).
ALTER TABLE "Review" ADD CONSTRAINT "Review_ratingPoint_check" CHECK ("ratingPoint" BETWEEN 1 AND 5);

-- University.worldRank must be between 1 and 30000 (inclusive).
ALTER TABLE "University" ADD CONSTRAINT "University_worldRank_check" CHECK ("worldRank" BETWEEN 1 AND 30000);

-- University.establishedYear must be between 1000 and the current year (inclusive).
ALTER TABLE "University" ADD CONSTRAINT "University_establishedYear_check" CHECK ("establishedYear" BETWEEN 1000 AND EXTRACT(YEAR FROM NOW())::int);
