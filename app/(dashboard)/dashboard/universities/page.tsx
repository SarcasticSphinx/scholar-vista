/**
 * Admin universities list (`/dashboard/universities`).
 *
 * Paginated 10/page with name/country search.
 * Validates: Requirements 18.1, 18.5, 18.7.
 */

import Link from "next/link";
import { Building2, Plus, SearchX } from "lucide-react";

import { listUniversities } from "@/lib/queries/university";
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
import { DeleteUniversityButton } from "./delete-university-button";

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

export default async function DashboardUniversitiesPage({ searchParams }: Props) {
    const params = await searchParams;
    const query = firstParam(params.q).trim();
    const page = parsePage(firstParam(params.page));

    const result = await listUniversities({
        search: query || undefined,
        page,
        pageSize: PAGE_SIZE,
    });

    return (
        <section className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Universities</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage university profiles.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/universities/new">
                        <Plus className="mr-2 size-4" />
                        New university
                    </Link>
                </Button>
            </header>

            {/* Search */}
            <form method="GET" className="flex gap-2">
                <Input
                    name="q"
                    defaultValue={query}
                    placeholder="Search by name or country…"
                    className="max-w-sm"
                />
                <Button type="submit" variant="secondary">Search</Button>
                {query && (
                    <Button asChild variant="ghost">
                        <Link href="/dashboard/universities">Clear</Link>
                    </Button>
                )}
            </form>

            {result.items.length > 0 ? (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Country</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Rank</TableHead>
                                <TableHead>Partner</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {result.items.map((u) => (
                                <TableRow key={u.id}>
                                    <TableCell className="font-medium">{u.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{u.country}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{u.type}</Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">#{u.worldRank}</TableCell>
                                    <TableCell>
                                        {u.isPartner ? (
                                            <Badge>Partner</Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button asChild variant="ghost" size="sm">
                                                <Link href={`/dashboard/universities/${u.id}/edit`}>
                                                    Edit
                                                </Link>
                                            </Button>
                                            <DeleteUniversityButton id={u.id} name={u.name} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <EmptyState
                    title="No universities found"
                    description={
                        query
                            ? `No universities match "${query}".`
                            : "Add your first university to get started."
                    }
                    icon={query ? SearchX : Building2}
                    action={
                        query
                            ? { label: "Clear search", href: "/dashboard/universities" }
                            : { label: "New university", href: "/dashboard/universities/new" }
                    }
                />
            )}

            {result.totalPages > 1 && (
                <Pagination
                    currentPage={result.page}
                    totalPages={result.totalPages}
                    baseUrl="/dashboard/universities"
                />
            )}
        </section>
    );
}
