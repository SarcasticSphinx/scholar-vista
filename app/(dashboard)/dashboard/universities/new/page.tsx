/**
 * Admin new university page (`/dashboard/universities/new`).
 * Validates: Requirements 18.2, 18.3.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UniversityForm } from "@/components/forms/university-form";

export default function NewUniversityPage() {
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
                    <CardTitle>New university</CardTitle>
                </CardHeader>
                <CardContent>
                    <UniversityForm />
                </CardContent>
            </Card>
        </section>
    );
}
