import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma";

// Get environment variables
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || "";
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

// Validate secret length
if (BETTER_AUTH_SECRET.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
}

export const auth = betterAuth({
  // Database adapter
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Secret for signing tokens
  secret: BETTER_AUTH_SECRET,

  // Base URL for callbacks
  baseURL: BETTER_AUTH_URL,

  // Enable email/password auth
  emailAndPassword: {
    enabled: true,
  },

  // Add custom user fields to session
  user: {
    additionalFields: {
      role: {
        type: "string",
        input: false,
      },
    },
  },
});

// Export types for use throughout the app
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
