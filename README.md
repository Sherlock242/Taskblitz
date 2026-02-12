# Task Blitz

Task Blitz is a lightweight, modern project management tool designed for teams who need to rapidly assign and track task workflows. It allows administrators to create reusable task templates and instantiate them as active workflows in a single action, streamlining repetitive processes and ensuring team consistency.

**Live Site**: [https://taskblitsz.netlify.app/](https://taskblitsz.netlify.app/)

## Key Features

- **Workflow Templating**: Create complex task lists with predefined roles, assignees, and relative deadlines.
- **Rapid Assignment**: Launch entire multi-stage workflows from a template with one click.
- **Role-Based Access Control**: Secure separation between Admins (managers) and Members (task executors).
- **Dynamic Status Tracking**: A state-machine driven dashboard that manages task transitions (Assigned -> In Progress -> Submitted -> Approved).
- **Audit & Activity**: Real-time comments and automated status change history for every task.
- **Review System**: Built-in "Submit for Review" cycle where designated reviewers can approve or request changes.

## Specifications

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password)
- **UI Components**: ShadCN UI (Radix UI)
- **Styling**: Tailwind CSS
- **AI Readiness**: Integrated with Genkit for future intelligent task generation.

### Database Architecture
- **Profiles**: Extended user data synced with Supabase Auth via triggers.
- **Templates**: Reusable JSONB definitions of task sequences.
- **Tasks**: Individual instances of work with unique `workflow_instance_id` to group related tasks.
- **Task History**: Automated logging of every status transition for compliance and tracking.
- **Comments**: Collaborative discussion thread per task.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

### 3. Database Setup
Execute the SQL script found in `src/README.md` within your Supabase SQL Editor.

## How to Run
```bash
npm run dev
```
The application will be available at `https://taskblitsz.netlify.app/` for local development.
