"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { approveScholarship, rejectScholarship } from "@/actions/scholarship";
import { Button } from "@/components/ui/button";

export function ApprovalActions({ id, title }: { id: string; title: string }) {
    const router = useRouter();
    const [pending, setPending] = React.useState<"approve" | "reject" | null>(null);

    const handleApprove = async () => {
        setPending("approve");
        try {
            const result = await approveScholarship(id);
            if (result.ok) {
                toast.success(`"${title}" approved.`);
                router.refresh();
            } else {
                toast.error(result.error.message || "Failed to approve.");
            }
        } catch {
            toast.error("Failed to approve.");
        } finally {
            setPending(null);
        }
    };

    const handleReject = async () => {
        if (!confirm(`Reject and delete "${title}"? This cannot be undone.`)) return;
        setPending("reject");
        try {
            const result = await rejectScholarship(id);
            if (result.ok) {
                toast.success(`"${title}" rejected and removed.`);
                router.refresh();
            } else {
                toast.error(result.error.message || "Failed to reject.");
            }
        } catch {
            toast.error("Failed to reject.");
        } finally {
            setPending(null);
        }
    };

    return (
        <div className="flex justify-end gap-2">
            <Button
                size="sm"
                variant="default"
                disabled={pending !== null}
                onClick={handleApprove}
                aria-label={`Approve ${title}`}
            >
                <Check className="mr-1 size-4" />
                Approve
            </Button>
            <Button
                size="sm"
                variant="destructive"
                disabled={pending !== null}
                onClick={handleReject}
                aria-label={`Reject ${title}`}
            >
                <X className="mr-1 size-4" />
                Reject
            </Button>
        </div>
    );
}
