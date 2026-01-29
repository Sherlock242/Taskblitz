"use client";

import React, { useTransition } from 'react';
import Link from 'next/link';
import type { Task, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { updateTaskStatus } from './actions';
import { DeleteTaskDialog } from './delete-task-dialog';

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

export type TaskWithProfile = Task & {
  profiles: Pick<User, 'name' | 'avatar_url'> | null;
};

export function DashboardClient({ tasks, userRole }: { tasks: TaskWithProfile[], userRole: User['role'] }) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    startTransition(async () => {
      const { error } = await updateTaskStatus(taskId, newStatus);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    });
  };

  if (tasks.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Task Dashboard</CardTitle>
                <CardDescription>An overview of all tasks in the system.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-semibold">No Tasks Yet</h3>
                    <p className="text-muted-foreground mt-2">Get started by assigning a template to a user.</p>
                    {userRole === 'Admin' && (
                      <Button asChild className="mt-4">
                          <Link href="/assign">Assign Tasks</Link>
                      </Button>
                    )}
                </div>
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
              <CardHeader className="pb-4 flex-row items-start justify-between">
                <div>
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
                </div>
                {userRole === 'Admin' && (
                  <DeleteTaskDialog taskId={task.id} taskName={task.name} />
                )}
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                   <Badge variant={getStatusVariant(task.status)} className={task.status === 'In Progress' ? 'animate-pulse' : ''}>
                      {task.status}
                    </Badge>
                  <Select
                    defaultValue={task.status}
                    onValueChange={(newStatus: Task['status']) => handleStatusChange(task.id, newStatus)}
                    disabled={isPending}
                  >
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
              {userRole === 'Admin' && <TableHead className="text-right">Actions</TableHead>}
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
                  <TableCell>
                    <div className="flex items-center justify-center">
                        <Badge variant={getStatusVariant(task.status)} className={task.status === 'In Progress' ? 'animate-pulse' : ''}>
                          {task.status}
                        </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      defaultValue={task.status}
                      onValueChange={(newStatus: Task['status']) => handleStatusChange(task.id, newStatus)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-[180px] h-9 ml-auto">
                        <SelectValue placeholder="Change status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="To Do">To Do</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {userRole === 'Admin' && (
                    <TableCell className="text-right">
                      <DeleteTaskDialog taskId={task.id} taskName={task.name} />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
