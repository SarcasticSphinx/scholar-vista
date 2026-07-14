/**
 * Admin dashboard summary page (`/dashboard`).
 *
 * Server component showing:
 *   - 4 stat tiles: total scholarships, universities, users, applications
 *   - 12-month application trend chart (lazy-loaded Recharts)
 *   - Scholarship-by-category distribution chart
 *   - 10 most recent applications
 *   - Up to 10 pending (unapproved) scholarships
 *
 * Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 25.4.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Building2, Users, FileText } from "lucide-react";

import { getDashboardStats, getCategoryDistribution } from "@/lib/queries/stats";
import { applicationTrendByMonth, listApplicationsAdmin } from "@/lib/queries/application";
import { pendingScholarships } from "@/lib/queries/scholarship";
import { formatDate, formatNumber } from "@/lib/intl";
import { buildMetadata } from "@/lib/seo";
import { StatCard } from "@/components/dashboard/stat-card";
import { ApplicationsTrendChart } from "@/components/dashboard/applications-trend-chart";
import { CategoryDistributionChart } from "@/components/dashboard/category-distribution-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
    title: "Dashboard | ScholarVista",
    description: "Admin dashboard overview for ScholarVista.",
    path: "/dashboard",
});

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    PENDING: "secondary",
    PROCESSING: "default",
    COMPLETED: "outline",
    REJECTED: "destructive",
};

export default async function DashboardPage() {
    const [stats, trend, categoryDist, recentApps, pending] = await Promise.all([
        getDashboardStats(),
        applicationTrendByMonth(12),
        getCategoryDistribution(),
        listApplicationsAdmin({ page: 1, pageSize: 10 }),
        pendingScholarships(1, 10),
    ]);

    const trendData = trend.map((b) => ({
        monthIso: b.monthIso,
        count: b.count,
    }));

    const categoryData = categoryDist.map((c) => ({
        category: c.category.replace("_", " "),
        count: c.count,
    }));

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Platform overview</p>
            </header>

            {/* Stat tiles */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Scholarships"
                    value={formatNumber(stats.scholarships)}
                    icon={GraduationCap}
                />
                <StatCard
                    label="Universities"
                    value={formatNumber(stats.universities)}
                    icon={Building2}
                />
                <StatCard
                    label="Users"
                    value={formatNumber(stats.users)}
                    icon={Users}
                />
                <StatCard
                    label="Applications"
                    value={formatNumber(stats.applications)}
                    icon={FileText}
                />
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Applications (12 months)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ApplicationsTrendChart data={trendData} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Scholarships by category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CategoryDistributionChart data={categoryData} />
                    </CardContent>
                </Card>
            </div>

            {/* Recent applications */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Recent applications</CardTitle>
                    <Link
                        href="/dashboard/applications"
                        className="text-sm text-brand hover:underline"
                    >
                        View all
                    </Link>
                </CardHeader>
                <CardContent className="p-0">
                    {recentApps.items.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Applicant</TableHead>
                                    <TableHead>Scholarship</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentApps.items.map((app) => (
                                    <TableRow key={app.id}>
                                        <TableCell className="font-medium">
                                            <Link
                                                href={`/dashboard/applications/${app.id}`}
                                                className="hover:underline"
                                            >
                                                {app.applicantName}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                                            {app.scholarship.title}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={STATUS_BADGE_VARIANT[app.status] ?? "secondary"}>
                                                {app.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(app.createdAt, undefined, {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="p-6">
                            <EmptyState
                                title="No applications yet"
                                description="Applications will appear here once users start applying."
                                icon={FileText}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pending approvals */}
            {pending.total > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">
                            Pending approvals{" "}
                            <Badge variant="secondary" className="ml-2">
                                {pending.total}
                            </Badge>
                        </CardTitle>
                        <Link
                            href="/dashboard/approvals"
                            className="text-sm text-brand hover:underline"
                        >
                            Review all
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Submitted by</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pending.items.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium max-w-[240px] truncate">
                                            {s.title}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {s.postedBy.name}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(s.createdAt, undefined, {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
