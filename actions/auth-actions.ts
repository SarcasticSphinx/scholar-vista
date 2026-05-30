"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Validation schema
const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
            .regex(/[a-z]/, "Password must contain at least one lowercase letter")
            .regex(/[0-9]/, "Password must contain at least one number"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

export interface AuthActionState {
    success: boolean;
    errors?: Record<string, string[]>;
    message?: string;
}

/**
 * Change password (for first-time login or regular password change)
 */
export async function changePassword(
    prevState: AuthActionState,
    formData: FormData
): Promise<AuthActionState> {
    try {
        const user = await requireAuth();

        const data = {
            currentPassword: formData.get("currentPassword") as string,
            newPassword: formData.get("newPassword") as string,
            confirmPassword: formData.get("confirmPassword") as string,
        };

        // Validate input
        const result = changePasswordSchema.safeParse(data);
        if (!result.success) {
            return {
                success: false,
                errors: result.error.flatten().fieldErrors as Record<string, string[]>,
            };
        }

        // Get user's credential account
        const account = await prisma.account.findFirst({
            where: {
                userId: user.id,
                providerId: "credential",
            },
        });

        if (!account || !account.password) {
            return {
                success: false,
                errors: { _form: ["Account not found or no password set"] },
            };
        }

        // Verify current password
        const ctx = await auth.$context;
        const isValidPassword = await ctx.password.verify({
            hash: account.password,
            password: result.data.currentPassword,
        });

        if (!isValidPassword) {
            return {
                success: false,
                errors: { currentPassword: ["Current password is incorrect"] },
            };
        }

        // Hash new password
        const hashedPassword = await ctx.password.hash(result.data.newPassword);

        // Update password in both User and Account
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    mustChangePassword: false,
                },
            });

            await tx.account.update({
                where: { id: account.id },
                data: { password: hashedPassword },
            });
        });

        revalidatePath("/");

        return {
            success: true,
            message: "Password changed successfully",
        };
    } catch (error) {
        console.error("Error changing password:", error);

        if (error instanceof Error) {
            // Handle authentication errors
            if (error.message === "Unauthorized") {
                return { success: false, errors: { _form: ["Please sign in to continue"] } };
            }
            
            // Handle account issues
            if (error.message.includes("Account not found")) {
                return { success: false, errors: { _form: ["Your account could not be found"] } };
            }
        }

        // Generic error - don't expose details
        return {
            success: false,
            errors: { _form: ["Unable to change password. Please try again later."] },
        };
    }
}

/**
 * Change password and redirect (for first-time login)
 */
export async function changePasswordAndRedirect(
    redirectTo: string,
    prevState: AuthActionState,
    formData: FormData
): Promise<AuthActionState> {
    const result = await changePassword(prevState, formData);
    
    if (result.success) {
        redirect(redirectTo);
    }
    
    return result;
}
