/**
 * Presentational role badge for dashboard user views.
 *
 * Maps a {@link UserRole} to a coloured shadcn `Badge` so admins can scan
 * the user list and detail pages quickly (Req 19.1, 19.3). Server-safe
 * (no client hooks).
 */

import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/lib/validation/user";

const ROLE_LABEL: Record<UserRole, string> = {
    ADMIN: "Admin",
    MODERATOR: "Moderator",
    USER: "User",
};

const ROLE_VARIANT: Record<
    UserRole,
    React.ComponentProps<typeof Badge>["variant"]
> = {
    ADMIN: "default",
    MODERATOR: "secondary",
    USER: "outline",
};

export interface RoleBadgeProps {
    role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
    return <Badge variant={ROLE_VARIANT[role]}>{ROLE_LABEL[role]}</Badge>;
}
