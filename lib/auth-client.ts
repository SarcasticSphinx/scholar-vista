/**
 * Better Auth client SDK for ScholarVista.
 *
 * Browser-side client built with `createAuthClient` from `better-auth/react`.
 * Configured with `NEXT_PUBLIC_APP_URL` so the client can resolve the auth
 * endpoints from the browser, and with `inferAdditionalFields` so the
 * ScholarVista user extensions (`role`, `profilePicture`,
 * `educationalLevel`, `major`, `country`, `city`, `dateOfBirth`) are typed
 * on the session/user objects.
 *
 * Re-exports the four hooks/methods the rest of the app consumes:
 *   - `signIn`     — email/password and social sign-in.
 *   - `signOut`    — sign out the current session.
 *   - `signUp`     — register a new account.
 *   - `useSession` — React hook returning the current session.
 *
 * Validates: Requirements 3.1, 3.2.
 */

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    // Type-level inference of the server-side `additionalFields`
    // (role, profilePicture, educationalLevel, major, country, city,
    // dateOfBirth) so consumers of `useSession()` get a fully typed user.
    inferAdditionalFields<typeof auth>(),
  ],
});

export const { signIn, signOut, signUp, useSession } = authClient;
