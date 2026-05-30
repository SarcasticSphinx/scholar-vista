import { headers } from "next/headers";
import { auth } from "./auth";
import { cache } from "react";

/**
 * Get the current session from the server.
 * Cached for the duration of a single request to prevent redundant database queries.
 */
export const getServerSession = cache(async () => {
    return await auth.api.getSession({ headers: await headers() });
});
