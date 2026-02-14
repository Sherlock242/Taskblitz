# Database Setup (SQL)

Copy and run this entire script in your Supabase SQL Editor to initialize the database for Task Blitz. This script sets up the user profiles (linked to Auth), task templates, active tasks, audit history, and collaboration comments.

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
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'Member',
    PRIMARY KEY (id)
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
$$ language plpgsql security definer;

-- Trigger the profile creation function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. ROW LEVEL SECURITY (RLS) - Idempotent script

-- Enable RLS on all relevant tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- Clear existing policies to prevent conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Templates viewable by authenticated" ON public.templates;
DROP POLICY IF EXISTS "Admins manage templates" ON public.templates;
DROP POLICY IF EXISTS "Users view involved tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Involved can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Comments viewable by involved users" ON public.comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments, and Admins can delete any" ON public.comments;
DROP POLICY IF EXISTS "History viewable by involved users" ON public.task_history;
DROP POLICY IF EXISTS "System can insert history" ON public.task_history;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Templates Policies
CREATE POLICY "Templates viewable by authenticated" ON public.templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage templates" ON public.templates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- Tasks Policies
CREATE POLICY "Users view involved tasks" ON public.tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin') OR
  primary_assignee_id = auth.uid() OR 
  reviewer_id = auth.uid() OR
  user_id = auth.uid()
);
CREATE POLICY "Authenticated can insert tasks" ON public.tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Involved can update tasks" ON public.tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin') OR
  primary_assignee_id = auth.uid() OR
  reviewer_id = auth.uid()
);
CREATE POLICY "Admins delete tasks" ON public.tasks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- Comments & History Policies
CREATE POLICY "Comments viewable by involved users" ON public.comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE
      tasks.id = comments.task_id AND (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin') OR
        tasks.primary_assignee_id = auth.uid() OR
        tasks.reviewer_id = auth.uid() OR
        tasks.user_id = auth.uid()
      )
  )
);

CREATE POLICY "Users can insert their own comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments, and Admins can delete any" ON public.comments FOR DELETE USING ( (auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')) );

CREATE POLICY "History viewable by involved users" ON public.task_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE
      tasks.id = task_history.task_id AND (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin') OR
        tasks.primary_assignee_id = auth.uid() OR
        tasks.reviewer_id = auth.uid() OR
        tasks.user_id = auth.uid()
      )
  )
);
CREATE POLICY "System can insert history" ON public.task_history FOR INSERT WITH CHECK (true);

-- 4. UTILITIES

-- Function for users to delete their own account (Self-service)
create or replace function public.delete_own_user_account()
returns void language sql security definer as $$
  delete from auth.users where id = auth.uid();
$$;

-- 5. STORAGE BUCKET CONFIGURATION (Informational)
-- In the Supabase Dashboard -> Storage:
-- 1. Create a public bucket named 'avatars'.
-- 2. Add the following RLS policy for the 'avatars' bucket:
--    - Allowed to: SELECT, INSERT, UPDATE
--    - For users: authenticated
--    - With check: (select (auth.uid() = (storage.foldername(name))[1]))

-- 6. Enable Realtime
-- This tells Supabase to broadcast changes on these tables.
alter publication supabase_realtime add table public.comments, public.task_history, public.tasks, public.templates, public.profiles;
```