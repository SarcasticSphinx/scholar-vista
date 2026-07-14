"use client";

/**
 * Admin role-change control (`/dashboard/users`).
 *
 * Client island wrapping the {@link changeRole} Server Action. Renders a
 * shadcn `Select` of the three roles (`ADMIN`, `MODERATOR`, `USER`) bound
 * to the user's current role. Changing the value calls the action and:
 *
 *   - Optimistically updates the displayed role, reverting on failure so
 *     the previous role is retained in the interface (Req 19.5).
 *   - Surfaces a success toast on persistence and an error toast on
 *     failure, including the `FORBIDDEN_SELF_CHANGE` case where an admin
 *     attempts to change their own role (Req 19.2).
 *
 * The control is disabled when:
 *   - `disabled` is set (the viewer is not an ADMIN — MODERATORs may view
 *     but not change roles), or
 *   - `isSelf` is set (an admin's own row — self-change is forbidden).
 *
 * Validates: Requirements 19.2, 19.4, 19.5.
 */

import * as React from "react";
import { toast } from "sonner";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { changeRole } from "@/actions/user";
import type { UserRole } from "@/lib/validation/user";

/** Roles offered in the select, ordered most → least privileged. */
const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
    { value: "ADMIN", label: "Admin" },
    { value: "MODERATOR", label: "Moderator" },
    { value: "USER", label: "User" },
];

export interface RoleSelectProps {
    /** Id of the user whose role this control manages. */
    userId: string;
    /** The user's current role (controls the selected value). */
    currentRole: UserRole;
    /**
     * Disable the control entirely. Set when the viewer lacks permission
     * to change roles (e.g. a MODERATOR viewing the list).
     */
    disabled?: boolean;
    /**
     * `true` when this row belongs to the signed-in admin. Self-changes
     * are forbidden, so the control is disabled with an explanatory title.
     */
    isSelf?: boolean;
}

export function RoleSelect({
    userId,
    currentRole,
    disabled = false,
    isSelf = false,
}: RoleSelectProps) {
    const [role, setRole] = React.useState<UserRole>(currentRole);
    const [pending, startTransition] = React.useTransition();

    // Keep local state in sync if the server re-renders with a new role
    // (e.g. after revalidation).
    React.useEffect(() => {
        setRole(currentRole);
    }, [currentRole]);

    const isDisabled = disabled || isSelf || pending;

    const onValueChange = React.useCallback(
        (next: string) => {
            const nextRole = next as UserRole;
            if (nextRole === role) return;

            const previous = role;
            // Optimistic update — reverted on failure (Req 19.5).
            setRole(nextRole);

            startTransition(async () => {
                const result = await changeRole(userId, nextRole);

                if (!result.ok) {
                    setRole(previous);
                    const message =
                        result.error.code === "FORBIDDEN_SELF_CHANGE"
                            ? "You cannot change your own role."
                            : result.error.message ||
                            "Role was not changed. Please try again.";
                    toast.error(message);
                    return;
                }

                setRole(result.data.role);
                toast.success("Role updated.");
            });
        },
        [role, userId],
    );

    const title = isSelf
        ? "You cannot change your own role"
        : disabled
            ? "Only admins can change roles"
            : undefined;

    return (
        <Select
            value={role}
            onValueChange={onValueChange}
            disabled={isDisabled}
        >
            <SelectTrigger
                size="sm"
                className="w-[140px]"
                aria-label={`Change role for this user (current: ${role})`}
                title={title}
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
