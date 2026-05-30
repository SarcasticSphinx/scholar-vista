# Error Handling Guide

Simple error handling patterns for the HomeX CRM project.

---

## Error Classes

We have three main error types in `src/lib/errors/`:

### AppError (Base)

```typescript
class AppError extends Error {
  constructor(message: string, statusCode: number = 500);
}
```

### HTTP Errors

```typescript
// 400 - Bad Request
throw new BadRequestError("Invalid input");

// 404 - Not Found
throw new NotFoundError("User not found");

// 422 - Validation Error
throw new ValidationError("Validation failed", {
  email: ["Invalid email format"],
  name: ["Name is required"],
});
```

---

## Usage in API Routes

Use the `withErrorHandling` wrapper to automatically catch and format errors:

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/with-error-handling";
import { BadRequestError, NotFoundError } from "@/lib/errors";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  // Validation
  if (!body.email) {
    throw new BadRequestError("Email is required");
  }

  // Create user
  const user = await prisma.user.create({ data: body });

  return NextResponse.json({ data: user }, { status: 201 });
});

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    throw new BadRequestError("User ID is required");
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return NextResponse.json({ data: user });
});
```

**Response format:**

```json
// Success
{
  "data": { ... }
}

// Error
{
  "error": "User not found"
}

// Validation error
{
  "error": "Validation failed",
  "fieldErrors": {
    "email": ["Invalid email format"]
  }
}
```

---

## Usage with Zod

Zod validation errors are automatically converted to `ValidationError`:

```typescript
import { z } from "zod";
import { withErrorHandling } from "@/lib/api/with-error-handling";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18),
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  // This will throw ValidationError if invalid
  const validated = createUserSchema.parse(body);

  const user = await prisma.user.create({ data: validated });

  return NextResponse.json({ data: user });
});
```

**Zod error response:**

```json
{
  "error": "Validation failed",
  "fieldErrors": {
    "name": ["String must contain at least 2 character(s)"],
    "email": ["Invalid email"],
    "age": ["Number must be greater than or equal to 18"]
  }
}
```

---

## Usage in Server Actions

```typescript
// actions/user.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

interface ActionState {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
}

export async function createUser(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const data = {
    name: formData.get("name"),
    email: formData.get("email"),
  };

  // Validate
  const result = createUserSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await prisma.user.create({ data: result.data });
    revalidatePath("/users");

    return {
      success: true,
      message: "User created successfully",
    };
  } catch (error) {
    return {
      success: false,
      errors: { _form: ["Failed to create user"] },
    };
  }
}
```

**Form component:**

```tsx
"use client";

import { useActionState } from "react";
import { createUser } from "@/actions/user";
import { Button } from "@/components/ui/button";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, {
    success: false,
  });

  return (
    <form action={action}>
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" />
        {state.errors?.name && (
          <p className="text-red-500 text-sm">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" />
        {state.errors?.email && (
          <p className="text-red-500 text-sm">{state.errors.email[0]}</p>
        )}
      </div>

      {state.errors?._form && (
        <p className="text-red-500">{state.errors._form[0]}</p>
      )}

      {state.success && <p className="text-green-500">{state.message}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create User"}
      </Button>
    </form>
  );
}
```

---

## Usage with Next.js notFound()

For triggering the 404 page:

```typescript
import { notFound } from "next/navigation";

// In a page component
export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
  });

  if (!user) {
    notFound(); // Shows not-found.tsx
  }

  return <div>{user.name}</div>;
}
```

---

## Try-Catch Helper

Use the `tryCatch` utility for safe async operations:

```typescript
import { tryCatch } from "@/lib/utils/try-catch";

const result = await tryCatch(fetchUserData(userId));

if (!result.success) {
  console.error("Failed:", result.error);
  return null;
}

// Use result.data
console.log(result.data);
```

---

## Error Pages

### 404 Not Found

`src/app/not-found.tsx` - Shows when `notFound()` is called or route doesn't exist.

### Error Boundary

`src/app/error.tsx` - Catches errors in page components.

### Global Error

`src/app/global-error.tsx` - Catches critical errors including layout errors.

---

## Best Practices

1. **Use specific error types**

   ```typescript
   // Good
   throw new NotFoundError("User not found");

   // Bad
   throw new Error("User not found");
   ```

2. **Validate early**

   ```typescript
   // Validate first
   if (!id) throw new BadRequestError("ID required");

   // Then query
   const user = await prisma.user.findUnique({ where: { id } });
   ```

3. **Let errors bubble in API routes**

   ```typescript
   // Good - withErrorHandling catches it
   export const GET = withErrorHandling(async (request) => {
     const user = await getUser(id); // Can throw NotFoundError
     return NextResponse.json({ data: user });
   });

   // Bad - unnecessary try-catch
   export const GET = withErrorHandling(async (request) => {
     try {
       const user = await getUser(id);
       return NextResponse.json({ data: user });
     } catch (error) {
       throw error; // Redundant
     }
   });
   ```

4. **Handle errors in Server Actions**

   ```typescript
   // Server actions can't use withErrorHandling
   // Always use try-catch and return state
   try {
     await doSomething();
     return { success: true };
   } catch (error) {
     return { success: false, errors: { _form: ["Error message"] } };
   }
   ```

5. **Don't expose sensitive errors to users**

   ```typescript
   // Good
   catch (error) {
     console.error("Database error:", error);
     return { success: false, errors: { _form: ["Something went wrong"] } };
   }

   // Bad
   catch (error) {
     return { success: false, errors: { _form: [error.message] } }; // Might expose DB details
   }
   ```

---

## Quick Reference

| Scenario       | Solution                                    |
| -------------- | ------------------------------------------- |
| API Route      | `withErrorHandling(handler)`                |
| Server Action  | `try-catch` + return state                  |
| Page Component | `notFound()` or let error boundary catch    |
| Validation     | Zod `.parse()` or `.safeParse()`            |
| 404            | `throw new NotFoundError()` or `notFound()` |
| Invalid Input  | `throw new BadRequestError()`               |
| Form Errors    | `ValidationError` with fieldErrors          |
| Safe Async     | `tryCatch(promise)`                         |
