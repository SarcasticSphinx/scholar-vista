/**
 * Better Auth server instance for ScholarVista.
 *
 * Configures:
 *   - Prisma adapter on PostgreSQL.
 *   - Email/password (8–128 char) login.
 *   - Google OAuth (when credentials are present).
 *   - The `nextCookies()` plugin for App Router cookie handling.
 *   - User additionalFields for the ScholarVista profile extensions
 *     (role, profilePicture, educationalLevel, major, country, city,
 *     dateOfBirth).
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.5.
 *
 * Note: the Prisma `User` table currently only carries the boilerplate
 * fields. The new ScholarVista columns are introduced in task 2.2's
 * migration; until then Better Auth will surface these `additionalFields`
 * via the session type without persisting them. The configuration here is
 * fixed and will start being persisted as soon as the migration runs.
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import prisma from "@/lib/prisma";
import { env } from "@/lib/env";

const hasGoogleCredentials = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  socialProviders: hasGoogleCredentials
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID as string,
          clientSecret: env.GOOGLE_CLIENT_SECRET as string,
        },
      }
    : {},

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "USER",
        input: false,
      },
      profilePicture: {
        type: "string",
        required: false,
      },
      educationalLevel: {
        type: "string",
        required: false,
      },
      major: {
        type: "string",
        required: false,
      },
      country: {
        type: "string",
        required: false,
      },
      city: {
        type: "string",
        required: false,
      },
      dateOfBirth: {
        type: "date",
        required: false,
      },
    },
  },

  plugins: [nextCookies()],
});

// Inferred Session/User types — re-exported for app-wide consumption.
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
