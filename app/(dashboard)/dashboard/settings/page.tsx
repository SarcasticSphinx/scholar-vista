/**
 * Admin settings page (`/dashboard/settings`).
 *
 * ADMIN-only (redirects non-admins to `/`). Upserts the singleton
 * `PlatformSettings` row via `updateSettings`.
 *
 * Validates: Requirements 34.1, 34.2, 34.4, 34.5.
 */

import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
    title: "Settings | ScholarVista",
    description: "Platform configuration and feature flags.",
    path: "/dashboard/settings",
});

export default async function SettingsPage() {
    // ADMIN-only gate (Req 34.1)
    let session;
    try {
        session = await requireRole(["ADMIN"]);
    } catch (error) {
        const msg = error instanceof Error ? error.message : "";
        redirect(msg === "FORBIDDEN" ? "/" : "/sign-in");
    }

    // Load current settings (or defaults)
    const settings = await prisma.platformSettings.findUnique({
        where: { id: "singleton" },
    });

    const defaultValues = {
        platformName: settings?.platformName ?? "ScholarVista",
        platformDescription:
            settings?.platformDescription ??
            "A scholarship management platform connecting students with opportunities.",
        featureUserSubmittedEnabled: settings?.featureUserSubmittedEnabled ?? true,
        featurePaymentEnabled: settings?.featurePaymentEnabled ?? true,
    };

    return (
        <section className="mx-auto max-w-2xl space-y-6">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground">
                    Configure platform details and feature flags.
                </p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Platform configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <SettingsForm defaultValues={defaultValues} />
                </CardContent>
            </Card>
        </section>
    );
}
