
import { createClient } from '@/lib/supabase/server';
import { DashboardClient, type TaskWithRelations } from './client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { User } from '@/lib/types';

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

  let tasksQuery = supabase.from('tasks').select('*, profiles!user_id(name, avatar_url), assigner:profiles!assigned_by(name, avatar_url), primary_assignee:profiles!primary_assignee_id(name, avatar_url), reviewer:profiles!reviewer_id(name, avatar_url), templates(name, description)');

  if (profile.role === 'Member') {
    // For members, first find all workflow instances they are a part of.
    // A user is part of a workflow if they are the primary assignee, the designated reviewer, or directly assigned a task.
    const { data: workflowIdsData, error: workflowIdsError } = await supabase
      .from('tasks')
      .select('workflow_instance_id')
      .or(`primary_assignee_id.eq.${user.id},reviewer_id.eq.${user.id},user_id.eq.${user.id}`);

    if (workflowIdsError) {
        console.error('Error fetching workflow IDs', workflowIdsError);
        return <p className="text-destructive text-center">Could not load tasks.</p>;
    }
    
    const workflowIds = [...new Set(workflowIdsData.map(t => t.workflow_instance_id))];

    if (workflowIds.length === 0) {
        return <DashboardClient tasks={[]} userRole={profile.role as User['role']} currentUserId={user.id} />;
    }

    // Then, fetch all tasks for those workflows.
    tasksQuery = tasksQuery.in('workflow_instance_id', workflowIds);
  }

  const { data: tasksData, error: tasksError } = await tasksQuery
    .order('created_at', { ascending: true })
    .order('position', { ascending: true, nullsFirst: false });


  if (tasksError) {
    console.error('Error fetching tasks', tasksError);
    return <p className="text-destructive text-center">Could not load tasks.</p>;
  }

  return <DashboardClient tasks={tasksData as unknown as TaskWithRelations[]} userRole={profile.role as User['role']} currentUserId={user.id} />;
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

    

    