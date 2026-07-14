"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteScholarship } from "@/actions/scholarship";
import { Button } from "@/components/ui/button";

export function DeleteScholarshipButton({ id, title }: { id: string; title: string }) {
    const router = useRouter();
    const [pending, setPending] = React.useState(false);

    const handleDelete = async () => {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        setPending(true);
        try {
            const result = await deleteScholarship(id);
            if (result.ok) {
                toast.success("Scholarship deleted.");
                router.refresh();
            } else {
                toast.error(result.error.message || "Failed to delete scholarship.");
            }
        } catch {
            toast.error("Failed to delete scholarship.");
        } finally {
            setPending(false);
        }
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
            aria-label={`Delete ${title}`}
        >
            <Trash2 className="size-4" />
        </Button>
    );
}
