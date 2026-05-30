# Next.js Boilerplate with Better-Auth Enhanced

A robust, production-ready boilerplate for building modern web applications with Next.js 16, Better-Auth, Prisma, and Tailwind CSS.

## Features

- **Framework**: [Next.js 16](https://nextjs.org/) (App Directory)
- **Authentication**: [Better-Auth](https://better-auth.com/) for secure, type-safe authentication.
- **Database**: [Prisma](https://www.prisma.io/) ORM with PostgreSQL.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) for modern, utility-first styling.
- **UI Components**: [Shadcn/UI](https://ui.shadcn.com/) (Radix UI + Tailwind).
- **Type Safety**: Fully typed with [TypeScript](https://www.typescriptlang.org/).
- **Icons**: [Lucide React](https://lucide.dev/).
- **Validation**: [Zod](https://zod.dev/) for schema validation.
- **File Uploads**: [UploadThing](https://uploadthing.com/).
- **Linting & Formatting**: ESLint and Prettier configuration.

## Tech Stack

- **Frontend**: React 19, Next.js 16, Tailwind CSS 4
- **Backend**: Next.js Server Actions / API Routes
- **Database**: PostgreSQL (via Prisma)
- **Auth**: Better-Auth (Polished & Type-safe)

## Getting Started

### Prerequisites

- Node.js 18+ established
- PostgreSQL Database
- npm, yarn, pnpm, or bun

### 1. Clone the repository

```bash
git clone https://github.com/SarcasticSphinx/next-js-boilerplate-with-better-auth.git
cd next-js-boilerplate-with-better-auth
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Setup

Create a `.env` file in the root directory and add the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"

# Authentication (Better-Auth)
BETTER_AUTH_SECRET="your_super_long_random_secret_string_at_least_32_chars"
BETTER_AUTH_URL="http://localhost:3000"

# Optional: UploadThing (if using file uploads)
UPLOADTHING_SECRET="your_uploadthing_secret"
UPLOADTHING_APP_ID="your_uploadthing_app_id"
```

> **Tip:** You can generate a random secret using `openssl rand -base64 32` or just smash your keyboard (responsibly).

### 4. Database Setup

Initialize the database schema:

```bash
npx prisma generate
npx prisma db push
```

(Optional) Seed the database if a seed script is available:

```bash
npm run prisma:seed
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
├── src
│   ├── app          # Next.js App Router pages and layouts
│   ├── components   # Reusable UI components
│   ├── lib          # Utility functions, auth config, and prisma client
│   ├── hooks        # Custom React hooks
│   ├── types        # Global TypeScript type definitions
│   └── actions      # Server Actions
├── prisma           # Prisma schema and migrations
├── public           # Static assets
└── ...config files  # Next.js, Tailwind, ESLint, etc.
```

## Authentication

Authentication is handled by **Better-Auth**.

- **Configuration**: `src/lib/auth.ts`
- **Client Helper**: `src/lib/auth-client.ts`
- **API Route**: `src/app/api/auth/[...all]/route.ts`
- **Middleware**: `src/middleware.ts` (Protects routes like `/admin`, `/dashboard`)

## Scripts

- `npm run dev`: Start development server.
- `npm run build`: Build for production.
- `npm start`: Start production server.
- `npm run lint`: Run ESLint.
- `npx prisma studio`: Open Prisma Studio to view database records.

## Deployment

The easiest way to deploy is using [Vercel](https://vercel.com).

1. Push your code to GitHub.
2. Import the project in Vercel.
3. Add your **Environment Variables** (`DATABASE_URL`, `BETTER_AUTH_SECRET`, etc.).
4. Click **Deploy**.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
