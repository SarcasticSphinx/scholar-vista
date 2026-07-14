/**
 * Admin application detail page (`/dashboard/applications/[id]`).
 *
 * Shows applicant fields + scholarship summary. Allows status updates.
 * Validates: Requirements 20.2, 20.3, 20.4, 20.5.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getApplicationById } from "@/lib/queries/application";
import { formatDate } from "@/lib/intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ApplicationStatusForm } from "./application-status-form";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    PENDING: "secondary",
    PROCESSING: "default",
    COMPLETED: "outline",
    REJECTED: "destructive",
};

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: Props) {
    const { id } = await params;
    const app = await getApplicationById(id);
    if (!app) notFound();

    return (
        <section className="mx-auto max-w-3xl space-y-6">
            <div>
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link href="/dashboard/applications">
                        <ArrowLeft className="mr-1 size-4" />
                        Back to applications
                    </Link>
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold tracking-tight">Application detail</h1>
                <Badge variant={STATUS_BADGE[app.status] ?? "secondary"}>
                    {app.status}
                </Badge>
            </div>

            {/* Scholarship summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Scholarship</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="font-medium">{app.scholarship.title}</p>
                    <p className="text-sm text-muted-foreground">
                        {app.scholarship.university.name} · {app.scholarship.university.country}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Deadline:{" "}
                        {formatDate(app.scholarship.deadline, undefined, {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                        })}
                    </p>
                </CardContent>
            </Card>

            {/* Applicant details */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Applicant</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                        <DetailRow label="Name" value={app.applicantName} />
                        <DetailRow label="Email" value={app.user.email} />
                        <DetailRow label="Phone" value={app.phone} />
                        <DetailRow label="Gender" value={app.gender} />
                        <DetailRow label="Applying degree" value={app.applyingDegree} />
                        <DetailRow label="Subject category" value={app.subjectCategory} />
                        <DetailRow label="SSC result" value={app.sscResult} />
                        <DetailRow label="HSC result" value={app.hscResult} />
                        <DetailRow label="Village" value={app.village} />
                        <DetailRow label="District" value={app.district} />
                        <DetailRow label="Country" value={app.country} />
                        <DetailRow
                            label="Applied on"
                            value={formatDate(app.createdAt, undefined, {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                            })}
                        />
                    </dl>
                </CardContent>
            </Card>

            {/* Feedback (if any) */}
            {app.feedback && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Admin feedback</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">{app.feedback}</p>
                    </CardContent>
                </Card>
            )}

            {/* Status update form */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Update status</CardTitle>
                </CardHeader>
                <CardContent>
                    <ApplicationStatusForm
                        applicationId={app.id}
                        currentStatus={app.status}
                    />
                </CardContent>
            </Card>
        </section>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-0.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
        </div>
    );
}
