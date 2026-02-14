import { createClient } from '@/lib/supabase/server';
import { DashboardClient, type TaskWithRelations } from './client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import React from 'react';
import { redirect } from 'next/navigation';
import type { User } from '@/lib/types';


export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching profile', profileError);
    return (
        <Card>
            <CardHeader>
                <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-destructive text-center">Could not load your profile. Please try again.</p>
            </CardContent>
        </Card>
    )
  }

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*, profiles!user_id(name, avatar_url), assigner:profiles!assigned_by(name, avatar_url), primary_assignee:profiles!primary_assignee_id(name, avatar_url), reviewer:profiles!reviewer_id(name, avatar_url), templates(name, description)');

  if (tasksError) {
    console.error('Error fetching tasks', tasksError);
     return (
        <Card>
            <CardHeader>
                <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-destructive text-center">Could not load tasks. Please try again.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <DashboardClient 
      initialTasks={tasks as TaskWithRelations[]}
      userRole={profile.role as User['role']} 
      currentUserId={user.id} 
    />
  );
}