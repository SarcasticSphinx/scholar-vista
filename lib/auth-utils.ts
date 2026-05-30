import { getServerSession } from "@/lib/get-session";

/**
 * Require authentication - returns user or throws error
 */
export async function requireAuth() {
    const session = await getServerSession();

    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    return session.user;
}

/**
 * Require admin role - returns admin user or throws error
 */
export async function requireAdmin() {
    const user = await requireAuth();

    if (user.role !== "ADMIN") {
        throw new Error("Forbidden - Admin access required");
    }

    return user;
}

/**
 * Require operator role - returns operator user or throws error
 */
export async function requireOperator() {
    const user = await requireAuth();

    if (user.role !== "OPERATOR") {
        throw new Error("Forbidden - Operator access required");
    }

    return user;
}

/**
 * Require admin or operator role
 */
export async function requireAdminOrOperator() {
    const user = await requireAuth();

    if (user.role !== "ADMIN" && user.role !== "OPERATOR") {
        throw new Error("Forbidden - Admin or Operator access required");
    }

    return user;
}

/**
 * Generic role checker
 */
export function hasRole(
    user: { role?: string | null },
    allowedRoles: string[]
) {
    return user.role ? allowedRoles.includes(user.role) : false;
}
