# Task Blitz

Task Blitz is a lightweight, modern project management tool designed for teams who need to rapidly assign and track tasks. It allows administrators to create reusable task templates and assign them to team members in a single action, streamlining workflow and ensuring consistency.

## Technology Stack

This project is built on a modern, robust, and scalable technology stack:

- **Framework**: [Next.js](https://nextjs.org/) (v15 with App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication**: [Supabase Auth](https://supabase.com/)
- **AI Integration**: [Genkit](https://firebase.google.com/docs/genkit) (for AI features)

## Prerequisites

Before you begin, ensure you have the following installed on your local machine:

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/)
- A [Supabase](https://supabase.com/) account.
- **Docker Desktop**: Required for Supabase CLI operations like `db dump`, `db pull`, or `db push`.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1.  Create a project at [Supabase](https://supabase.com/).
2.  In **Project Settings > API**, get your **Project URL**, `anon` key, and `service_role` key.

### 3. Configure Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_ACCESS_TOKEN=YOUR_CLI_ACCESS_TOKEN
```

### 4. Supabase CLI Usage

1.  **Initialize**: `npx supabase init`
2.  **Link project**: `npx supabase link --project-ref izcuehamxzfcdietlmig`
3.  **Database Operations**: `npx supabase db pull` (Requires Docker)

## Environment Limitations

Note that some Supabase CLI commands (like `db dump` or `db pull`) require **Docker** to be running on the host machine. 
- **Cloud IDEs/Browser Terminals**: These environments typically do not support Docker. In these cases, manage your database schema directly via the [Supabase Dashboard SQL Editor](https://supabase.com/dashboard).
- **Local Development**: To use the full power of the CLI, clone the repository to your local machine and ensure **Docker Desktop** is installed and running.

## How to Run

```bash
npm run dev
```

The application will be available at [http://localhost:9002](http://localhost:9002).