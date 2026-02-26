# Database Setup (SQL)

Copy and run this entire script in your Supabase SQL Editor to initialize the database for Task Blitz. This script sets up the user profiles (linked to Auth), task templates, active tasks, audit history, and collaboration comments. This script is idempotent, meaning it is safe to run multiple times.

```sql
-- DANGER: This script deletes existing tables before recreating them.
-- It is designed to be run on a fresh database.
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.task_history CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. CREATE TABLES

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'Member'
);

-- Templates table
CREATE TABLE public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    tasks JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    deadline TIMESTAMPTZ,
    template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Workflow Owner
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    primary_assignee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    position INTEGER
);

-- Task History table (Audit Trails)
CREATE TABLE public.task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_primary_assignee_id_idx ON public.tasks(primary_assignee_id);
CREATE INDEX IF NOT EXISTS tasks_reviewer_id_idx ON public.tasks(reviewer_id);
CREATE INDEX IF NOT EXISTS tasks_template_id_idx ON public.tasks(template_id);
CREATE INDEX IF NOT EXISTS tasks_assigned_by_idx ON public.tasks(assigned_by);
CREATE INDEX IF NOT EXISTS comments_task_id_idx ON public.comments(task_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS task_history_task_id_idx ON public.task_history(task_id);
CREATE INDEX IF NOT EXISTS task_history_user_id_idx ON public.task_history(user_id);


-- 2. AUTHENTICATION & PROFILE TRIGGERS

-- Function to automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'role', 'Member')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Trigger the profile creation function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. ROW LEVEL SECURITY (RLS)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is an Admin (Highly performant)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin');
$$ LANGUAGE sql SECURITY DEFINER set search_path = '';

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Templates Policies
CREATE POLICY "Templates viewable by authenticated" ON public.templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can create templates" ON public.templates FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update templates" ON public.templates FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete templates" ON public.templates FOR DELETE USING (public.is_admin());

-- Tasks Policies
CREATE POLICY "Users view involved tasks" ON public.tasks FOR SELECT USING (
  public.is_admin() OR
  primary_assignee_id = auth.uid() OR
  reviewer_id = auth.uid() OR
  user_id = auth.uid()
);
CREATE POLICY "Authenticated can insert tasks" ON public.tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Involved can update tasks" ON public.tasks FOR UPDATE USING (
  public.is_admin() OR
  primary_assignee_id = auth.uid() OR
  reviewer_id = auth.uid()
);
CREATE POLICY "Admins delete tasks" ON public.tasks FOR DELETE USING (public.is_admin());

-- Comments Policies
CREATE POLICY "Comments viewable by involved users" ON public.comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE
      tasks.id = comments.task_id AND (
        public.is_admin() OR
        tasks.primary_assignee_id = auth.uid() OR
        tasks.reviewer_id = auth.uid() OR
        tasks.user_id = auth.uid()
      )
  )
);
CREATE POLICY "Users can insert their own comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments, and Admins can delete any" ON public.comments FOR DELETE USING ( (auth.uid() = user_id) OR public.is_admin() );

-- History Policies
CREATE POLICY "History viewable by involved users" ON public.task_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE
      tasks.id = task_history.task_id AND (
        public.is_admin() OR
        tasks.primary_assignee_id = auth.uid() OR
        tasks.reviewer_id = auth.uid() OR
        tasks.user_id = auth.uid()
      )
  )
);
CREATE POLICY "System can insert history" ON public.task_history FOR INSERT WITH CHECK (false);

-- 4. UTILITIES
create or replace function public.delete_own_user_account()
returns void language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;

-- 5. Enable Realtime
alter publication supabase_realtime add table public.comments, public.task_history, public.tasks, public.templates, public.profiles;

-- 6. STORAGE SETUP (RUN THIS TO FIX PROFILE PICTURES)
-- This section creates the bucket and the necessary RLS policies for storage.

-- Ensure the 'avatars' bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to see avatars (Public access)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload to their own folder
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatar
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatar
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```
