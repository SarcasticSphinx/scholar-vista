/**
 * Admin edit scholarship page (`/dashboard/scholarships/[id]/edit`).
 * Validates: Requirements 17.2, 17.3, 17.4.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScholarshipForm, type ScholarshipFormDefaultValues } from "@/components/forms/scholarship-form";

export const dynamic = "force-dynamic";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EditScholarshipPage({ params }: Props) {
    const { id } = await params;

    const [scholarship, universities] = await Promise.all([
        prisma.scholarship.findUnique({
            where: { id },
            include: { university: { select: { id: true, name: true } } },
        }),
        prisma.university.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
    ]);

    if (!scholarship) notFound();

    // Format deadline as YYYY-MM-DD for the date input
    const deadlineStr = scholarship.deadline.toISOString().split("T")[0];

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
                    <CardTitle>Edit scholarship</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScholarshipForm
                        universities={universities}
                        editId={id}
                        defaultValues={{
                            title: scholarship.title,
                            universityId: scholarship.universityId,
                            category: scholarship.category as ScholarshipFormDefaultValues["category"],
                            subject: scholarship.subject,
                            description: scholarship.description,
                            stipend: scholarship.stipend.toString(),
                            coverage: scholarship.coverage,
                            location: scholarship.location,
                            requirements: scholarship.requirements,
                            deadline: deadlineStr,
                            applicationLink: scholarship.applicationLink,
                            fees: scholarship.fees.toString(),
                            image: scholarship.image,
                            isApproved: scholarship.isApproved,
                        }}
                    />
                </CardContent>
            </Card>
        </section>
    );
}
