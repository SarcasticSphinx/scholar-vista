import { nextCookies } from "better-auth/next-js";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
    plugins: [
        // Infer custom fields (like 'role') from server config
        inferAdditionalFields<typeof auth>(),
        // Handle cookies in Next.js
        nextCookies(),
    ],
});
