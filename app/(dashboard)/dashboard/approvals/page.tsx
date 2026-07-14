/**
 * Admin approvals page (`/dashboard/approvals`).
 *
 * Paginated 20/page sorted by submission date asc. Shows submitter name + email.
 * Validates: Requirements 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 17.6.
 */

import { CheckSquare } from "lucide-react";

import { pendingScholarships } from "@/lib/queries/scholarship";
import { formatDate } from "@/lib/intl";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ApprovalActions } from "./approval-actions";

export const dynamic = "force-dynamic";

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

export default async function ApprovalsPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = parsePage(firstParam(params.page));

    const result = await pendingScholarships(page, 20);

    return (
        <section className="space-y-6">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Pending approvals{" "}
                    {result.total > 0 && (
                        <Badge variant="secondary" className="ml-2 align-middle">
                            {result.total}
                        </Badge>
                    )}
                </h1>
                <p className="text-sm text-muted-foreground">
                    Review user-submitted scholarships before they appear in public listings.
                </p>
            </header>

            {result.items.length > 0 ? (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Submitted by</TableHead>
                                <TableHead>Submitted on</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {result.items.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium max-w-[200px] truncate">
                                        {s.title}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {s.category.replace("_", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        <div>{s.postedBy.name}</div>
                                        <div className="text-xs">{s.postedBy.email}</div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatDate(s.createdAt, undefined, {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <ApprovalActions id={s.id} title={s.title} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <EmptyState
                    title="No pending submissions"
                    description="All user-submitted scholarships have been reviewed."
                    icon={CheckSquare}
                />
            )}

            {result.totalPages > 1 && (
                <Pagination
                    currentPage={result.page}
                    totalPages={result.totalPages}
                    baseUrl="/dashboard/approvals"
                />
            )}
        </section>
    );
}
