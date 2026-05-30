# Better Auth Implementation - HomeX CRM

A comprehensive guide to the Better Auth implementation in the HomeX CRM real estate management application.

## Overview

This implementation uses **Better Auth** for authentication with the following key features:

- **Email/Password Authentication**: Agents sign in using email and password
- **Admin-Managed Credentials**: Admins create agents and set their passwords during creation
- **First-Time Password Change**: Agents are prompted to change their password on first login
- **Role-Based Access Control (RBAC)**: ADMIN, AGENT, and CLIENT roles
- **Server-Side Session Management**: Sessions retrieved on the server for RSC and Server Actions
- **Prisma Adapter**: Database storage using PostgreSQL via Prisma

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    HOMEX CRM AUTHENTICATION FLOW                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. ADMIN SEEDING (Initial Setup)                                       │
│     ┌──────────┐        ┌──────────────┐                               │
│     │ Database │───────▶│ Create Admin │ (via prisma/seed.ts)          │
│     │   Seed   │        │ User + Acct  │                               │
│     └──────────┘        └──────────────┘                               │
│                                                                         │
│  2. AGENT CREATION (Admin Panel - /admin/team)                          │
│     ┌──────────┐        ┌──────────────┐        ┌──────────────┐       │
│     │  Admin   │───────▶│ Server Action│───────▶│ Create User  │       │
│     └──────────┘        │ createAgent  │        │ + Account    │       │
│                         └──────────────┘        │ (mustChange) │       │
│                                                 └──────────────┘       │
│  3. AGENT SIGN-IN                                                       │
│     ┌──────────┐        ┌──────────────┐        ┌──────────────┐       │
│     │  Agent   │───────▶│ Better Auth  │───────▶│ Check        │       │
│     │ (Client) │        │ signIn.email │        │ mustChange   │       │
│     └──────────┘        └──────────────┘        └──────┬───────┘       │
│                                                        │                │
│                          ┌─────────────────────────────┴───────┐       │
│                          ▼                                     ▼       │
│                   ┌──────────────┐                   ┌──────────────┐  │
│                   │ First Login? │                   │ Return User  │  │
│                   │ Show Modal   │                   │ + Redirect   │  │
│                   └──────────────┘                   └──────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx              # Auth layout
│   │   └── signin/
│   │       └── page.tsx            # Sign-in page
│   ├── (dashboard)/
│   │   └── admin/
│   │       └── team/
│   │           ├── page.tsx        # Team management page
│   │           └── team-page-client.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...all]/
│   │   │       └── route.ts        # Better Auth handler
│   │   └── uploadthing/
│   │       ├── core.ts             # UploadThing config
│   │       └── route.ts            # UploadThing handler
│   └── actions/
├── actions/
│   ├── agent-actions.ts            # Agent CRUD (createAgent, updateAgent, etc.)
│   └── auth-actions.ts             # Password change action
├── components/
│   ├── admin/
│   │   └── agent-form.tsx          # Agent create/edit form
│   └── auth/
│       ├── signin-form.tsx         # Sign-in form
│       └── change-password-modal.tsx
└── lib/
    ├── auth.ts                     # Better Auth config
    ├── auth-client.ts              # Better Auth React client
    ├── auth-utils.ts               # Authorization helpers
    ├── get-session.ts              # Cached session retrieval
    └── prisma.ts                   # Prisma client
```

---

## Key Implementation Details

### 1. Agent Creation (Server Action)

Agents are created by admins with a password set during creation:

```typescript
// src/actions/agent-actions.ts
export async function createAgent(
  prevState: AgentActionState,
  formData: FormData
): Promise<AgentActionState> {
  await requireAdmin();
  
  // Hash password using Better Auth's internal hasher
  const ctx = await auth.$context;
  const hashedPassword = await ctx.password.hash(password);
  
  // Create user and account in transaction
  await prisma.$transaction(async (tx) => {
    // Create user with mustChangePassword: true
    await tx.user.create({
      data: {
        name, email, phone, image,
        role: "AGENT",
        password: hashedPassword,
        mustChangePassword: true,
      },
    });
    
    // Create credential account (REQUIRED for Better Auth login)
    await tx.account.create({
      data: {
        userId,
        accountId: email,
        providerId: "credential",
        password: hashedPassword,
      },
    });
  });
}
```

### 2. First-Time Password Change

After sign-in, if `mustChangePassword` is true, a modal appears:

```typescript
// src/components/auth/signin-form.tsx
const user = data.user as { role?: string; mustChangePassword?: boolean };

if (user.mustChangePassword) {
  setShowChangePasswordModal(true);
  return;
}
```

### 3. Authorization Utilities

```typescript
// src/lib/auth-utils.ts
export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden - Admin access required");
  }
  return user;
}

export async function requireAgent() {
  const user = await requireAuth();
  if (user.role !== "AGENT") {
    throw new Error("Forbidden - Agent access required");
  }
  return user;
}
```

### 4. Protected Server Actions

```typescript
// In any server action
export async function someAdminAction(formData: FormData) {
  try {
    await requireAdmin();
    // ... action logic
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return { success: false, errors: { _form: ["Please sign in"] } };
      }
      if (error.message.includes("Forbidden")) {
        return { success: false, errors: { _form: ["Admin access required"] } };
      }
    }
  }
}
```

---

## Database Schema Additions

The following fields were added for Better Auth:

```prisma
model User {
  password           String?  // Hashed password (copy from Account)
  mustChangePassword Boolean  @default(false)
}

model Session {
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Account {
  providerId            String  // Better Auth uses providerId
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@unique([providerId, accountId])
}

model Verification {
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## Environment Variables

```env
# Better Auth
BETTER_AUTH_SECRET=your-secret-at-least-32-characters
BETTER_AUTH_URL=http://localhost:3000

# UploadThing (for agent images)
UPLOADTHING_TOKEN=your-token
UPLOADTHING_SECRET_KEY=your-secret-key
```

---

## Quick Reference

```typescript
// Get session in server component/action
const session = await getServerSession();
const user = session?.user;

// Use authorization utilities
const user = await requireAuth();      // Any logged-in user
const admin = await requireAdmin();    // Admin only
const agent = await requireAgent();    // Agent only

// Sign in on client
const { data, error } = await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password123',
});

// Sign out on client
await authClient.signOut();

// Hash password server-side
const ctx = await auth.$context;
const hash = await ctx.password.hash('newpassword');
```

---

## Default Admin Credentials

After running the seed script:

- **Email:** admin@homex.com
- **Password:** Admin123!

Run the seed:
```bash
npx prisma db seed
```

---

## Testing the Implementation

1. **Start the dev server:** `npm run dev`
2. **Navigate to:** `http://localhost:3000/signin`
3. **Sign in as admin:** admin@homex.com / Admin123!
4. **Create an agent:** Go to /admin/team → Add Agent
5. **Test agent login:** Sign out, sign in with agent credentials
6. **Verify password change modal appears**
