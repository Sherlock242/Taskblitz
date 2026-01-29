"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { tasks as initialTasks, users as initialUsers } from '@/lib/data';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isClient, setIsClient] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const usersById = useMemo(() => 
    initialUsers.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, typeof initialUsers[0]>)
  , [initialUsers]);

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    setTasks(currentTasks =>
      currentTasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
  };

  if (!isClient) {
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
          const user = usersById[task.userId];
          return (
            <Card key={task.id}>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{task.name}</CardTitle>
                {user && (
                  <div className="flex items-center gap-2 pt-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatarUrl} />
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
              const user = usersById[task.userId];
              return (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.name}</TableCell>
                  <TableCell>
                    {user ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatarUrl} />
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
