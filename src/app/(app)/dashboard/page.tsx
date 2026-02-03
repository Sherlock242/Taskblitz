
import { createClient } from '@/lib/supabase/server';
import { DashboardClient, type TaskWithRelations } from './client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { User, Task } from '@/lib/types';
import { createClient as createAdminClient } from '@supabase/supabase-js';

async function DashboardData() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // This should be handled by layout, but as a safeguard
    return redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching profile', profileError);
    return <p className="text-destructive text-center">Could not load your profile.</p>;
  }

  let allTasks: any[] = [];
  let tasksError: any = null;

  const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
  );

  if (profile.role === 'Admin') {
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*, profiles!user_id(name, avatar_url), assigner:profiles!assigned_by(name, avatar_url), primary_assignee:profiles!primary_assignee_id(name, avatar_url), reviewer:profiles!reviewer_id(name, avatar_url), templates(name, description)');
    
    if (data) {
        allTasks = data;
    }
    tasksError = error;

  } else {
    // 1. Get all workflow IDs the user is part of
    const { data: userTasks, error: userTasksError } = await supabase
        .from('tasks')
        .select('workflow_instance_id')
        .or(`primary_assignee_id.eq.${user.id},reviewer_id.eq.${user.id}`);

    if (userTasksError) {
        console.error('Error fetching user workflow IDs', userTasksError);
        return <p className="text-destructive text-center">Could not load tasks.</p>;
    }

    if (userTasks && userTasks.length > 0) {
        const workflowIds = [...new Set(userTasks.map(t => t.workflow_instance_id))];
        
        // 2. Use admin client to fetch ALL raw tasks for those workflows
        const { data: workflowRawTasks, error: workflowTasksError } = await supabaseAdmin
            .from('tasks')
            .select('*')
            .in('workflow_instance_id', workflowIds);

        tasksError = workflowTasksError;

        if (workflowRawTasks) {
            // 3. Manually fetch all relations needed
            const userIds = new Set<string>();
            const templateIds = new Set<string>();
            workflowRawTasks.forEach(task => {
                if (task.user_id) userIds.add(task.user_id);
                if (task.assigned_by) userIds.add(task.assigned_by);
                if (task.primary_assignee_id) userIds.add(task.primary_assignee_id);
                if (task.reviewer_id) userIds.add(task.reviewer_id);
                if (task.template_id) templateIds.add(task.template_id);
            });

            const { data: profilesData, error: profilesError } = await supabaseAdmin.from('profiles').select('id, name, avatar_url').in('id', Array.from(userIds));
            const { data: templatesData, error: templatesError } = await supabaseAdmin.from('templates').select('id, name, description').in('id', Array.from(templateIds));

            if (profilesError || templatesError) {
                console.error('Error fetching relations', { profilesError, templatesError });
                return <p className="text-destructive text-center">Could not load task relations.</p>;
            }

            const profileMap = new Map(profilesData?.map(p => [p.id, p]));
            const templateMap = new Map(templatesData?.map(t => [t.id, t]));
            
            // 4. Join data manually
            allTasks = workflowRawTasks.map(task => ({
                ...task,
                profiles: profileMap.get(task.user_id) || null,
                assigner: profileMap.get(task.assigned_by) || null,
                primary_assignee: profileMap.get(task.primary_assignee_id) || null,
                reviewer: profileMap.get(task.reviewer_id) || null,
                templates: task.template_id ? templateMap.get(task.template_id) : null,
            }));
        }
    }
  }
  
  if (tasksError) {
    console.error('Error fetching tasks', tasksError);
    return <p className="text-destructive text-center">Could not load tasks.</p>;
  }
  
  // Merge and de-duplicate tasks that might be fetched twice (e.g., if user is both assignee and reviewer)
  const uniqueTasks = Array.from(new Map(allTasks.map(task => [task.id, task])).values());

  // Sort tasks
  uniqueTasks.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    if (dateA !== dateB) {
      return dateA - dateB;
    }
    return (a.position ?? 0) - (b.position ?? 0);
  });

  return <DashboardClient tasks={uniqueTasks as unknown as TaskWithRelations[]} userRole={profile.role as User['role']} currentUserId={user.id} />;
}


export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Task Dashboard</CardTitle>
        <CardDescription>An overview of all tasks in the system.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </CardContent>
    </Card>
  )
}
