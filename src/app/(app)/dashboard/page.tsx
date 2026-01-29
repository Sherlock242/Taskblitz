"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Task, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const getStatusVariant = (status: Task['status']): 'default' | 'secondary' | 'outline' | 'destructive' => {
  switch (status) {
    case 'Done':
      return 'secondary';
    case 'In Progress':
      return 'default';
    case 'To Do':
      return 'outline';
    default:
      return 'outline';
  }
};

type TaskWithProfile = Task & {
  profiles: Pick<User, 'name' | 'avatar_url'> | null;
};

export default function DashboardPage() {
  const [tasks, setTasks] = useState<TaskWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const supabase = createClient();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    
    // 1. Fetch tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*');

    if (tasksError) {
      console.error('Error fetching tasks', tasksError);
      toast({ title: 'Error', description: 'Could not fetch tasks.', variant: 'destructive' });
      setLoading(false);
      return;
    }
    
    if (!tasksData) {
        setTasks([]);
        setLoading(false);
        return;
    }

    // 2. Get unique user IDs from the tasks
    const userIds = [...new Set(tasksData.map(task => task.user_id).filter(Boolean))];

    let profilesById: Record<string, Pick<User, 'name' | 'avatar_url'>> = {};

    if (userIds.length > 0) {
        // 3. Fetch the corresponding profiles for the user IDs
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', userIds);

        if (profilesError) {
            console.error('Error fetching profiles for tasks', profilesError);
            // This is not a fatal error, we can still display tasks without user info
        } else if (profilesData) {
            // Create a map of profiles by their ID for easy lookup
            profilesById = profilesData.reduce((acc, profile) => {
                acc[profile.id] = profile;
                return acc;
            }, {} as Record<string, Pick<User, 'name' | 'avatar_url'>>);
        }
    }
    
    // 4. Combine the tasks data with the profiles data
    const combinedData = tasksData.map(task => ({
      ...task,
      profiles: profilesById[task.user_id] || null
    })) as TaskWithProfile[];

    setTasks(combinedData);
    setLoading(false);
  }, [supabase, toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    const originalTasks = [...tasks];
    
    setTasks(currentTasks =>
      currentTasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', taskId);
      
    if (error) {
      setTasks(originalTasks);
      toast({ title: 'Error', description: 'Could not update task status.', variant: 'destructive' });
    }
  };

  if (loading) {
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
    );
  }

  if (isMobile) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight font-headline">Task Dashboard</h1>
            <p className="text-muted-foreground">An overview of all tasks in the system.</p>
        </div>
        {tasks.map(task => {
          const user = task.profiles;
          return (
            <Card key={task.id}>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{task.name}</CardTitle>
                {user && (
                  <div className="flex items-center gap-2 pt-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">Assigned to {user.name}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                   <Badge variant={getStatusVariant(task.status)} className={task.status === 'In Progress' ? 'animate-pulse' : ''}>
                      {task.status}
                    </Badge>
                  <Select value={task.status} onValueChange={(newStatus: Task['status']) => handleStatusChange(task.id, newStatus)}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To Do">To Do</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Task Dashboard</CardTitle>
        <CardDescription>An overview of all tasks in the system.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Change Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map(task => {
              const user = task.profiles;
              return (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.name}</TableCell>
                  <TableCell>
                    {user ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{user.name}</span>
                      </div>
                    ) : 'Unassigned'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getStatusVariant(task.status)} className={task.status === 'In Progress' ? 'animate-pulse' : ''}>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Select value={task.status} onValueChange={(newStatus: Task['status']) => handleStatusChange(task.id, newStatus)}>
                      <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="Change status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="To Do">To Do</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
