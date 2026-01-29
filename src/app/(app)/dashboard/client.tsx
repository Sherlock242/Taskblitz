"use client";

import React, { useTransition, useMemo } from 'react';
import Link from 'next/link';
import type { Task, User, Template } from '@/lib/types';
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

export type TaskWithRelations = Task & {
  profiles: Pick<User, 'name' | 'avatar_url'> | null;
  assigner: Pick<User, 'name' | 'avatar_url'> | null;
  templates: Pick<Template, 'name' | 'description'> | null;
};

export function DashboardClient({ tasks, userRole }: { tasks: TaskWithRelations[], userRole: User['role'] }) {
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

  const groupedByTemplate = useMemo(() => {
    // The key will be a combination of templateId and userId to create unique groups.
    const groups: Record<string, { 
        id: string; 
        name: string; 
        description: string; 
        tasks: TaskWithRelations[]; 
        assigner: Pick<User, 'name' | 'avatar_url'> | null;
        assignee: Pick<User, 'name' | 'avatar_url'> | null;
    }> = {};
    
    tasks.forEach(task => {
        const templateId = task.template_id || 'unassigned';
        const userId = task.user_id;
        const groupKey = `${templateId}-${userId}`;

        const templateName = task.templates?.name || 'General Tasks';
        const templateDescription = task.templates?.description || 'Tasks not associated with a template.';

        if (!groups[groupKey]) {
            groups[groupKey] = {
                id: groupKey,
                name: templateName,
                description: templateDescription,
                tasks: [],
                assigner: task.assigner,
                assignee: task.profiles, // The user assigned the tasks
            };
        }
        groups[groupKey].tasks.push(task);
    });

    return Object.values(groups);
  }, [tasks]);

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
  
  const PageHeader = () => (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold tracking-tight font-headline">Task Dashboard</h1>
      <p className="text-muted-foreground">An overview of all tasks in the system.</p>
    </div>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader />
        {groupedByTemplate.map(group => (
            <Card key={group.id} className="w-full">
                <CardHeader>
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <CardTitle className="font-headline">{group.name}</CardTitle>
                            {group.description && <CardDescription>{group.description}</CardDescription>}
                        </div>
                        <div className="flex flex-col gap-4 items-end flex-shrink-0">
                            {group.assigner && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={group.assigner.avatar_url || undefined} alt={group.assigner.name ?? ''}/>
                                        <AvatarFallback>{group.assigner.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col text-xs text-right">
                                        <span>Assigned by</span>
                                        <span className="font-medium text-foreground">{group.assigner.name}</span>
                                    </div>
                                </div>
                            )}
                            {group.assignee && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={group.assignee.avatar_url || undefined} alt={group.assignee.name ?? ''}/>
                                        <AvatarFallback>{group.assignee.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col text-xs text-right">
                                        <span>Assigned to</span>
                                        <span className="font-medium text-foreground">{group.assignee.name}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 p-4 pt-0">
                    {group.tasks.map(task => {
                        return (
                            <Card key={task.id}>
                                <CardHeader className="pb-4 flex-row items-start justify-between">
                                    <CardTitle className="text-lg">{task.name}</CardTitle>
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
                </CardContent>
            </Card>
        ))}
      </div>
    );
  }

  return (
     <div className="flex flex-col gap-6">
        <PageHeader />
        {groupedByTemplate.map(group => (
            <Card key={group.id}>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="font-headline">{group.name}</CardTitle>
                            {group.description && <CardDescription>{group.description}</CardDescription>}
                        </div>
                        <div className="flex items-center gap-6">
                             {group.assigner && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={group.assigner.avatar_url || undefined} alt={group.assigner.name ?? ''}/>
                                        <AvatarFallback>{group.assigner.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col text-xs text-right">
                                        <span>Assigned by</span>
                                        <span className="font-medium text-foreground">{group.assigner.name}</span>
                                    </div>
                                </div>
                            )}
                            {group.assignee && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={group.assignee.avatar_url || undefined} alt={group.assignee.name ?? ''}/>
                                        <AvatarFallback>{group.assignee.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col text-xs text-right">
                                        <span>Assigned to</span>
                                        <span className="font-medium text-foreground">{group.assignee.name}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Task</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-center">Change Status</TableHead>
                            {userRole === 'Admin' && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {group.tasks.map(task => {
                                return (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium">{task.name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center">
                                                <Badge variant={getStatusVariant(task.status)} className={task.status === 'In Progress' ? 'animate-pulse' : ''}>
                                                {task.status}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-center">
                                            <Select
                                                defaultValue={task.status}
                                                onValueChange={(newStatus: Task['status']) => handleStatusChange(task.id, newStatus)}
                                                disabled={isPending}
                                            >
                                                <SelectTrigger className="w-[180px] h-9">
                                                <SelectValue placeholder="Change status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                <SelectItem value="To Do">To Do</SelectItem>
                                                <SelectItem value="In Progress">In Progress</SelectItem>
                                                <SelectItem value="Done">Done</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            </div>
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
        ))}
     </div>
  );
}
