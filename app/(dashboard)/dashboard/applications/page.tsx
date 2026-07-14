/**
 * Admin applications list (`/dashboard/applications`).
 *
 * Paginated 10/page with status filter and applicant/scholarship search.
 * Validates: Requirements 20.1, 20.2, 20.6.
 */

import Link from "next/link";
import { FileText, SearchX } from "lucide-react";

import { listApplicationsAdmin } from "@/lib/queries/application";
import { formatDate } from "@/lib/intl";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ApplicationStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    PENDING: "secondary",
    PROCESSING: "default",
    COMPLETED: "outline",
    REJECTED: "destructive",
};

function firstParam(v: string | string[] | undefined): string {
    return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}
function parsePage(v: string): number {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n >= 1 ? n : 1;
}

interface Props {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardApplicationsPage({ searchParams }: Props) {
    const params = await searchParams;
    const query = firstParam(params.q).trim();
    const statusParam = firstParam(params.status);
    const page = parsePage(firstParam(params.page));

    const validStatuses = Object.values(ApplicationStatus) as string[];
    const status = validStatuses.includes(statusParam)
        ? (statusParam as ApplicationStatus)
        : undefined;

    const result = await listApplicationsAdmin({
        applicantQuery: query || undefined,
        status,
        page,
        pageSize: 10,
    });

    return (
        <section className="space-y-6">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
                <p className="text-sm text-muted-foreground">
                    Review and manage scholarship applications.
                </p>
            </header>

            {/* Filters */}
            <form method="GET" className="flex flex-wrap gap-2">
                <Input
                    name="q"
                    defaultValue={query}
                    placeholder="Search applicant name or email…"
                    className="max-w-xs"
                />
                <select
                    name="status"
                    defaultValue={statusParam}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                    <option value="">All statuses</option>
                    {Object.values(ApplicationStatus).map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <Button type="submit" variant="secondary">Filter</Button>
                {(query || statusParam) && (
                    <Button asChild variant="ghost">
                        <Link href="/dashboard/applications">Clear</Link>
                    </Button>
                )}
            </form>

            {result.items.length > 0 ? (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Applicant</TableHead>
                                <TableHead>Scholarship</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {result.items.map((app) => (
                                <TableRow key={app.id}>
                                    <TableCell className="font-medium">
                                        {app.applicantName}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground max-w-[180px] truncate">
                                        {app.scholarship.title}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={STATUS_BADGE[app.status] ?? "secondary"}>
                                            {app.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={app.paymentStatus === "PAID" ? "default" : "outline"}>
                                            {app.paymentStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatDate(app.createdAt, undefined, {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="ghost" size="sm">
                                            <Link href={`/dashboard/applications/${app.id}`}>
                                                View
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <EmptyState
                    title="No applications found"
                    description={
                        query || statusParam
                            ? "No applications match your filters."
                            : "Applications will appear here once users start applying."
                    }
                    icon={query || statusParam ? SearchX : FileText}
                    action={
                        query || statusParam
                            ? { label: "Clear filters", href: "/dashboard/applications" }
                            : undefined
                    }
                />
            )}

            {result.totalPages > 1 && (
                <Pagination
                    currentPage={result.page}
                    totalPages={result.totalPages}
                    baseUrl="/dashboard/applications"
                />
            )}
        </section>
    );
}
