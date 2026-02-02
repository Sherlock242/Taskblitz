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

You need to run a SQL script in your Supabase project to create the necessary tables (`profiles`, `templates`, `tasks`), set up permissions, and configure storage.

1.  In your Supabase project dashboard, navigate to the **SQL Editor** (the database icon).
2.  Click **New query**.
3.  Copy the entire script below and paste it into the SQL Editor.
4.  Click **RUN** to execute the script.

```sql
-- DANGER: This script deletes existing tables before recreating them.
-- You will lose all data in the 'comments', 'tasks', 'templates', and 'profiles' tables.
-- Back up any important data before running this script.

-- Drop existing tables in reverse order of creation to handle dependencies
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop old enum type if it exists
DROP TYPE IF EXISTS public.task_status CASCADE;

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
    tasks JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a table for individual tasks
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    deadline TIMESTAMPTZ,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    primary_assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    position INTEGER
);

-- Create a table for comments
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 2. SET UP AUTH TRIGGERS

-- Drop trigger if it exists, it will be recreated
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Function to create a profile for a new user
create or replace function public.handle_new_user()
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


-- 3. SET UP ROW LEVEL SECURITY (RLS)

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Drop old policies before creating new ones
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;
DROP POLICY IF EXISTS "Templates are viewable by authenticated users." ON public.templates;
DROP POLICY IF EXISTS "Admins can manage templates." ON public.templates;
DROP POLICY IF EXISTS "Users can view their assigned or submitted tasks." ON public.tasks;
DROP POLICY IF EXISTS "Admins can view all tasks." ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks." ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks, Admins can update any." ON public.tasks;
DROP POLICY IF EXISTS "Users and Admins can update tasks based on workflow role." ON public.tasks;
DROP POLICY IF EXISTS "Users involved in a task can update it." ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete tasks." ON public.tasks;
DROP POLICY IF EXISTS "Admins can manage all comments." ON public.comments;
DROP POLICY IF EXISTS "Members can view comments on their assigned or submitted tasks." ON public.comments;
DROP POLICY IF EXISTS "Members can create comments on their assigned or submitted tasks." ON public.comments;
DROP POLICY IF EXISTS "Members can update their own comments." ON public.comments;
DROP POLICY IF EXISTS "Members can delete their own comments." ON public.comments;


-- Create policies for 'profiles'
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile." ON public.profiles FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin');


-- Create policies for 'templates'
CREATE POLICY "Templates are viewable by authenticated users." ON public.templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage templates." ON public.templates FOR ALL USING ( (select role from profiles where id = auth.uid()) = 'Admin' );

-- Create policies for 'tasks'
CREATE POLICY "Users can view their assigned or submitted tasks." ON public.tasks FOR SELECT USING (auth.uid() = user_id OR auth.uid() = primary_assignee_id);
CREATE POLICY "Admins can view all tasks." ON public.tasks FOR SELECT USING ((select role from profiles where id = auth.uid()) = 'Admin');
CREATE POLICY "Users can insert tasks." ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users involved in a task can update it." ON public.tasks
FOR UPDATE
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin' OR
    auth.uid() = user_id OR
    auth.uid() = primary_assignee_id
)
WITH CHECK (
    true
);
CREATE POLICY "Admins can delete tasks." ON public.tasks FOR DELETE USING ((select role from profiles where id = auth.uid()) = 'Admin');

-- Create policies for 'comments'
CREATE POLICY "Admins can manage all comments." ON public.comments FOR ALL
    USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin' );

CREATE POLICY "Members can view comments on their assigned or submitted tasks." ON public.comments
FOR SELECT
TO authenticated
USING (
    task_id IN (SELECT id FROM public.tasks WHERE user_id = auth.uid() OR primary_assignee_id = auth.uid())
);

CREATE POLICY "Members can create comments on their assigned or submitted tasks." ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() AND
    task_id IN (SELECT id FROM public.tasks WHERE user_id = auth.uid() OR primary_assignee_id = auth.uid())
);

CREATE POLICY "Members can update their own comments." ON public.comments FOR UPDATE
    TO authenticated
    USING ( user_id = auth.uid() );

CREATE POLICY "Members can delete their own comments." ON public.comments FOR DELETE
    TO authenticated
    USING ( user_id = auth.uid() );


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


-- 5. SET UP STORAGE (for avatar uploads)

-- Create a bucket for 'avatars' with public access
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Drop old policies before creating new ones
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar." ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;

-- Allow public read access to everyone
CREATE POLICY "Avatar images are publicly accessible."
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload to their own folder in the avatars bucket
CREATE POLICY "Users can upload their own avatar."
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( auth.uid()::text = (storage.foldername(name))[1] AND bucket_id = 'avatars' );

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar."
ON storage.objects FOR UPDATE
TO authenticated
USING ( auth.uid()::text = (storage.foldername(name))[1] );

```

## How to Run the Application

Once you have completed the setup, you can start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:9002](http://localhost:9002).
