/**
 * Admin new scholarship page (`/dashboard/scholarships/new`).
 * Validates: Requirements 17.2, 17.3.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScholarshipForm } from "@/components/forms/scholarship-form";

export const dynamic = "force-dynamic";

export default async function NewScholarshipPage() {
    const universities = await prisma.university.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    return (
        <section className="mx-auto max-w-3xl space-y-6">
            <div>
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link href="/dashboard/scholarships">
                        <ArrowLeft className="mr-1 size-4" />
                        Back to scholarships
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>New scholarship</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScholarshipForm universities={universities} />
                </CardContent>
            </Card>
        </section>
    );
}
