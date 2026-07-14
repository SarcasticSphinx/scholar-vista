"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteUniversity } from "@/actions/university";
import { Button } from "@/components/ui/button";

export function DeleteUniversityButton({ id, name }: { id: string; name: string }) {
    const router = useRouter();
    const [pending, setPending] = React.useState(false);

    const handleDelete = async () => {
        if (!confirm(`Delete "${name}"? This will also remove all associated scholarships.`)) return;
        setPending(true);
        try {
            const result = await deleteUniversity(id);
            if (result.ok) {
                toast.success("University deleted.");
                router.refresh();
            } else {
                toast.error(result.error.message || "Failed to delete university.");
            }
        } catch {
            toast.error("Failed to delete university.");
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
            aria-label={`Delete ${name}`}
        >
            <Trash2 className="size-4" />
        </Button>
    );
}
