/**
 * Admin user detail page (`/dashboard/users/[id]`).
 *
 * Server component showing a single user's details: name, email, role,
 * registration date, plus derived applied-scholarships and bookmarks
 * counts (Req 19.3). Data comes from {@link getUserById}, which returns
 * the same profile DTO (including `_count`s) used by the profile page.
 *
 * Returns `notFound()` when no user matches the id.
 *
 * Validates: Requirements 19.3.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getUserById } from "@/lib/queries/user";
import { formatDate } from "@/lib/intl";
import { RoleBadge } from "@/components/dashboard/role-badge";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

/** Auth-gated detail view — render at request time. */
export const dynamic = "force-dynamic";

/** Build the two-letter avatar fallback from a display name. */
function initialsOf(name: string): string {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .join("") || "?"
    );
}

interface UserDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function DashboardUserDetailPage({
    params,
}: UserDetailPageProps) {
    const { id } = await params;
    const user = await getUserById(id);

    if (!user) {
        notFound();
    }

    const avatarSrc = user.profilePicture ?? user.image ?? undefined;
    const longDate = (iso: string) =>
        formatDate(iso, undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
        });

    return (
        <section className="mx-auto max-w-3xl space-y-6">
            <div>
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link href="/dashboard/users">
                        <ArrowLeft aria-hidden="true" className="size-4" />
                        Back to users
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="size-14">
                        {avatarSrc ? (
                            <AvatarImage src={avatarSrc} alt={user.name} />
                        ) : null}
                        <AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <CardTitle className="text-xl">{user.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {user.email}
                        </p>
                        <RoleBadge role={user.role} />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <dl className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <dt className="text-sm text-muted-foreground">
                                Applied scholarships
                            </dt>
                            <dd className="text-2xl font-semibold tabular-nums">
                                {user.counts.applications}
                            </dd>
                        </div>
                        <div className="space-y-1">
                            <dt className="text-sm text-muted-foreground">
                                Bookmarks
                            </dt>
                            <dd className="text-2xl font-semibold tabular-nums">
                                {user.counts.bookmarks}
                            </dd>
                        </div>
                    </dl>

                    <dl className="grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-2">
                        <DetailRow label="Role" value={user.role} />
                        <DetailRow
                            label="Registered"
                            value={longDate(user.createdAt)}
                        />
                        {user.educationalLevel ? (
                            <DetailRow
                                label="Educational level"
                                value={user.educationalLevel}
                            />
                        ) : null}
                        {user.major ? (
                            <DetailRow label="Major" value={user.major} />
                        ) : null}
                        {user.country ? (
                            <DetailRow label="Country" value={user.country} />
                        ) : null}
                        {user.city ? (
                            <DetailRow label="City" value={user.city} />
                        ) : null}
                        {user.dateOfBirth ? (
                            <DetailRow
                                label="Date of birth"
                                value={longDate(user.dateOfBirth)}
                            />
                        ) : null}
                    </dl>
                </CardContent>
            </Card>
        </section>
    );
}

/** Small definition-list row for a labelled detail value. */
function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-1">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium">{value}</dd>
        </div>
    );
}
