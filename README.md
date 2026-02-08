# Task Blitz

Task Blitz is a lightweight, modern project management tool designed for teams who need to rapidly assign and track tasks. It allows administrators to create reusable task templates and assign them to team members in a single action, streamlining workflow and ensuring consistency.

## Technology Stack

This project is built on a modern, robust, and scalable technology stack:

- **Framework**: [Next.js](https://nextjs.org/) (v14 with App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication**: [Supabase Auth](https://supabase.com/)
- **AI Integration**: [Genkit](https://firebase.google.com/docs/genkit) (for potential future AI features)

## Prerequisites

Before you begin, ensure you have the following installed on your local machine:

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js) or [Yarn](https://yarnpkg.com/)
- A [Supabase](https://supabase.com/) account to create your database.

## Setup Instructions

Follow these steps to get your local development environment set up and running.

### 1. Install Dependencies

First, install all the necessary project dependencies using npm:

```bash
npm install
```

### 2. Set Up Supabase

The application relies on Supabase for its database and authentication.

1.  Go to the [Supabase website](https://supabase.com/) and create a new project.
2.  Once your project is created, navigate to **Project Settings** (the gear icon in the left sidebar).
3.  Click on the **API** tab.
4.  You will find your **Project URL** and your `anon` **public API key**. You will need these for the next step.

### 3. Configure Environment Variables

Create a new file named `.env.local` in the root directory of the project. Copy and paste the following content into it, replacing the placeholder values with the credentials from your Supabase project:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_ACCESS_TOKEN=YOUR_CLI_ACCESS_TOKEN
```

### 4. Supabase CLI Usage

The project is initialized with the Supabase CLI (v2.75.0).

1.  **Initialize Supabase**:
    ```bash
    npx supabase init
    ```

2.  **Link your project**:
    ```bash
    npx supabase link --project-ref izcuehamxzfcdietlmig
    ```

3.  **Pull changes or dump schema**:
    ```bash
    npx supabase db pull
    # or
    npx supabase db dump --schema public > schema.sql
    ```

### 5. Set Up the Database Schema

You need to run a SQL script in your Supabase project to create the necessary tables (`profiles`, `templates`, `tasks`), set up permissions, and configure storage.

1.  In your Supabase project dashboard, navigate to the **SQL Editor** (the database icon).
2.  Click **New query**.
3.  Copy the entire script from the `schema.sql` (if provided) or from the setup documentation and paste it into the SQL Editor.
4.  Click **RUN** to execute the script.

## How to Run the Application

Once you have completed the setup, you can start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:9002](http://localhost:9002).