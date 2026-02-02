
import { createClient } from '@/lib/supabase/server';
import { DashboardClient, type TaskWithRelations } from './client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { User, Task } from '@/lib/types';

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

  let allTasks: Task[] = [];
  let tasksError: any = null;

  if (profile.role === 'Admin') {
    // Admin: Fetch all tasks
    const { data, error } = await supabase
      .from('tasks')
      .select('*, profiles!user_id(name, avatar_url), assigner:profiles!assigned_by(name, avatar_url), primary_assignee:profiles!primary_assignee_id(name, avatar_url), reviewer:profiles!reviewer_id(name, avatar_url), templates(name, description)');
    allTasks = data || [];
    tasksError = error;
  } else {
    // Member: Fetch only assigned tasks and tasks for review
    const { data: myTasks, error: myTasksError } = await supabase
      .from('tasks')
      .select('*, profiles!user_id(name, avatar_url), assigner:profiles!assigned_by(name, avatar_url), primary_assignee:profiles!primary_assignee_id(name, avatar_url), reviewer:profiles!reviewer_id(name, avatar_url), templates(name, description)')
      .eq('user_id', user.id);

    const { data: reviewTasks, error: reviewTasksError } = await supabase
      .from('tasks')
      .select('*, profiles!user_id(name, avatar_url), assigner:profiles!assigned_by(name, avatar_url), primary_assignee:profiles!primary_assignee_id(name, avatar_url), reviewer:profiles!reviewer_id(name, avatar_url), templates(name, description)')
      .eq('reviewer_id', user.id)
      .eq('status', 'Submitted for Review');
    
    tasksError = myTasksError || reviewTasksError;
    if (!tasksError) {
        allTasks = [...(myTasks || []), ...(reviewTasks || [])];
    }
  }


  if (tasksError) {
    console.error('Error fetching tasks', tasksError);
    return <p className="text-destructive text-center">Could not load tasks.</p>;
  }
  
  // Merge and de-duplicate tasks (important for Members, harmless for Admins)
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
