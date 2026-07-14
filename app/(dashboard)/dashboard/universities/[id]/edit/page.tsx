/**
 * Admin edit university page (`/dashboard/universities/[id]/edit`).
 * Validates: Requirements 18.3, 18.4.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getUniversityById } from "@/lib/queries/university";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UniversityForm, type UniversityFormDefaultValues } from "@/components/forms/university-form";

export const dynamic = "force-dynamic";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EditUniversityPage({ params }: Props) {
    const { id } = await params;
    const university = await getUniversityById(id);
    if (!university) notFound();

    const defaultValues: UniversityFormDefaultValues = {
        name: university.name,
        logo: university.logo,
        contactEmail: university.contactEmail,
        website: university.website,
        description: university.description,
        address: university.address,
        country: university.country,
        city: university.city,
        worldRank: university.worldRank,
        type: university.type as UniversityFormDefaultValues["type"],
        establishedYear: university.establishedYear,
        isPartner: university.isPartner,
        acceptingApplications: university.acceptingApplications,
    };

    return (
        <section className="mx-auto max-w-3xl space-y-6">
            <div>
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link href="/dashboard/universities">
                        <ArrowLeft className="mr-1 size-4" />
                        Back to universities
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Edit university</CardTitle>
                </CardHeader>
                <CardContent>
                    <UniversityForm editId={id} defaultValues={defaultValues} />
                </CardContent>
            </Card>
        </section>
    );
}
