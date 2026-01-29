# Task Blitz

Task Blitz is a lightweight, modern project management tool designed for teams who need to rapidly assign and track tasks. It allows administrators to create reusable task templates and assign them to team members in a single action, streamlining workflow and ensuring consistency.

## Technology Stack

This project is built on a modern, robust, and scalable technology stack:

- **Framework**: [Next.js](https://nextjs.org/) (v14 with App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication**: [Supabase Auth](https://supabase.com/docs/guides/auth)
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
```

### 4. Set Up the Database Schema

You need to run a SQL script in your Supabase project to create the necessary tables (`profiles`, `templates`, `tasks`) and set up permissions.

1.  In your Supabase project dashboard, navigate to the **SQL Editor** (the database icon).
2.  Click **New query**.
3.  Copy the entire script below and paste it into the SQL Editor.
4.  Click **RUN** to execute the script.

```sql
-- 1. CREATE TABLES

-- Create a table for public user profiles
CREATE TABLE public.profiles (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    role TEXT,
    PRIMARY KEY (id)
);

-- Create a table for task templates
CREATE TABLE public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    tasks TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a table for individual tasks
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    position INTEGER
);


-- 2. SET UP AUTH TRIGGERS

-- Function to create a profile for a new user
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, avatar_url, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'role');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 3. SET UP ROW LEVEL SECURITY

-- Enable Row Level Security for all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for 'profiles'
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Create policies for 'templates'
CREATE POLICY "Templates are viewable by authenticated users." ON templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage templates." ON templates FOR ALL USING ( (select role from profiles where id = auth.uid()) = 'Admin' );

-- Create policies for 'tasks'
CREATE POLICY "Users can view their own assigned tasks." ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all tasks." ON tasks FOR SELECT USING ((select role from profiles where id = auth.uid()) = 'Admin');
CREATE POLICY "Users can insert tasks." ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own tasks." ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete tasks." ON tasks FOR DELETE USING ((select role from profiles where id = auth.uid()) = 'Admin');


-- 4. SET UP USER DELETION

-- Create a function to allow a user to delete their own account
create or replace function public.delete_own_user_account()
returns void
language sql
security definer
as $$
  delete from auth.users where id = auth.uid();
$$;

-- Grant execute permission on the function to authenticated users
grant execute on function public.delete_own_user_account() to authenticated;
```

## How to Run the Application

Once you have completed the setup, you can start the development server:

```bash
npm run dev
```

The application will be available at [https://taskblitsz.netlify.app/login](https://taskblitsz.netlify.app/login).
