/**
 * Admin scholarships list (`/dashboard/scholarships`).
 *
 * Paginated 10/page with search and filters (category, approval, university).
 * Validates: Requirements 17.1, 17.5, 17.7.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { GraduationCap, Plus, SearchX } from "lucide-react";

import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/intl";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { DeleteScholarshipButton } from "./delete-scholarship-button";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

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

export default async function DashboardScholarshipsPage({ searchParams }: Props) {
    const params = await searchParams;
    const query = firstParam(params.q).trim();
    const page = parsePage(firstParam(params.page));
    const approvalFilter = firstParam(params.approved);

    const where = {
        ...(query.length >= 2
            ? {
                OR: [
                    { title: { contains: query, mode: "insensitive" as const } },
                    { university: { name: { contains: query, mode: "insensitive" as const } } },
                ],
            }
            : {}),
        ...(approvalFilter === "true"
            ? { isApproved: true }
            : approvalFilter === "false"
                ? { isApproved: false }
                : {}),
    };

    const [total, rows] = await Promise.all([
        prisma.scholarship.count({ where }),
        prisma.scholarship.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            include: { university: { select: { name: true } } },
        }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <section className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Scholarships</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage all scholarship listings.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/scholarships/new">
                        <Plus className="mr-2 size-4" />
                        New scholarship
                    </Link>
                </Button>
            </header>

            {/* Search */}
            <form method="GET" className="flex gap-2">
                <Input
                    name="q"
                    defaultValue={query}
                    placeholder="Search by title or university…"
                    className="max-w-sm"
                />
                <Button type="submit" variant="secondary">Search</Button>
                {query && (
                    <Button asChild variant="ghost">
                        <Link href="/dashboard/scholarships">Clear</Link>
                    </Button>
                )}
            </form>

            {rows.length > 0 ? (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>University</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Deadline</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium max-w-[200px] truncate">
                                        {s.title}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {s.university.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {s.category.replace("_", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={s.isApproved ? "default" : "outline"}>
                                            {s.isApproved ? "Approved" : "Pending"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatDate(s.deadline.toISOString(), undefined, {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button asChild variant="ghost" size="sm">
                                                <Link href={`/dashboard/scholarships/${s.id}/edit`}>
                                                    Edit
                                                </Link>
                                            </Button>
                                            <DeleteScholarshipButton id={s.id} title={s.title} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <EmptyState
                    title="No scholarships found"
                    description={
                        query
                            ? `No scholarships match "${query}".`
                            : "Create your first scholarship to get started."
                    }
                    icon={query ? SearchX : GraduationCap}
                    action={
                        query
                            ? { label: "Clear search", href: "/dashboard/scholarships" }
                            : { label: "New scholarship", href: "/dashboard/scholarships/new" }
                    }
                />
            )}

            {totalPages > 1 && (
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    baseUrl="/dashboard/scholarships"
                />
            )}
        </section>
    );
}
