/**
 * Barrel exports for validation schemas.
 *
 * Each module owns a single domain (scholarship, application, etc.) and
 * exports its primary Zod schema(s) plus the inferred input types.
 * Consumers should prefer `import { ApplicationSchema } from "@/lib/validation/application"`
 * over star-imports from this barrel for tree-shaking, but the barrel
 * remains available for convenience.
 */

export * from "./application";
export * from "./bookmark";
export * from "./image";
export * from "./review";
export * from "./scholarship";
export * from "./settings";
export * from "./university";
export * from "./user";
