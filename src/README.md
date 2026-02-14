# Database Setup (SQL)

Copy and run this entire script in your Supabase SQL Editor to initialize the database for Task Blitz. This script sets up the user profiles (linked to Auth), task templates, active tasks, audit history, and collaboration comments.

```sql
-- DANGER: This script deletes existing tables before recreating them.
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.task_history CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. CREATE TABLES

-- Profiles table (linked to auth.users)
-- This handles user identity, roles, and avatar metadata.
CREATE TABLE public.profiles (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'Member',
    PRIMARY KEY (id)
);

-- Templates table
-- Stores reusable task sequences in JSONB format.
CREATE TABLE public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    tasks JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
-- Individual instances of work. Linked by workflow_instance_id.
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    deadline TIMESTAMPTZ,
    template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Workflow Owner
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    primary_assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    position INTEGER
);

-- Task History table (Audit Trails)
-- Tracks every status change for every task.
CREATE TABLE public.task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table
-- For task-level collaboration.
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

-- 3. ROW LEVEL SECURITY (RLS)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Comments viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users manage own comments" ON public.comments FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Viewable history" ON public.task_history FOR SELECT USING (true);
CREATE POLICY "System inserts history" ON public.task_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. UTILITIES

-- Function for users to delete their own account (Self-service)
create or replace function public.delete_own_user_account()
returns void language sql security definer as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

-- 5. STORAGE BUCKET CONFIGURATION (Informational)
-- In the Supabase Dashboard -> Storage:
-- 1. Create a public bucket named 'avatars'.
-- 2. Add the following RLS policy for the 'avatars' bucket:
--    - Allowed to: SELECT, INSERT, UPDATE
--    - For users: authenticated
--    - Path: (select (auth.uid() = (storage.foldername(name))[1]))
```
