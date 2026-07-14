"use client";

/**
 * Client form for updating an application's status.
 * Enforces the state machine: PENDING→PROCESSING, PROCESSING→{COMPLETED|REJECTED}.
 * Validates: Requirements 20.3, 20.4, 20.5.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateApplicationStatus } from "@/actions/application";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { ApplicationStatus } from "@/generated/prisma/client";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    PENDING: ["PROCESSING"],
    PROCESSING: ["COMPLETED", "REJECTED"],
    COMPLETED: [],
    REJECTED: [],
};

interface Props {
    applicationId: string;
    currentStatus: ApplicationStatus;
}

export function ApplicationStatusForm({ applicationId, currentStatus }: Props) {
    const router = useRouter();
    const [pending, setPending] = React.useState(false);
    const [newStatus, setNewStatus] = React.useState("");
    const [feedback, setFeedback] = React.useState("");

    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] ?? [];

    if (allowedNext.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                This application is in a terminal state ({currentStatus}) and cannot be updated further.
            </p>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStatus) {
            toast.error("Please select a new status.");
            return;
        }
        setPending(true);
        try {
            const result = await updateApplicationStatus(
                applicationId,
                newStatus as ApplicationStatus,
                feedback || null,
            );
            if (result.ok) {
                toast.success(`Status updated to ${newStatus}.`);
                router.refresh();
            } else {
                toast.error(result.error.message || "Failed to update status.");
            }
        } catch {
            toast.error("Failed to update status.");
        } finally {
            setPending(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="newStatus">New status</Label>
                <Select value={newStatus} onValueChange={setNewStatus} disabled={pending}>
                    <SelectTrigger id="newStatus" className="max-w-xs">
                        <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                        {allowedNext.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="feedback">
                    Feedback{" "}
                    <span className="font-normal text-muted-foreground">(optional, max 1000 chars)</span>
                </Label>
                <Textarea
                    id="feedback"
                    rows={3}
                    maxLength={1000}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    disabled={pending}
                    placeholder="Explain the decision to the applicant…"
                />
            </div>

            <Button type="submit" disabled={pending || !newStatus}>
                {pending ? (
                    <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Updating…
                    </>
                ) : (
                    "Update status"
                )}
            </Button>
        </form>
    );
}
