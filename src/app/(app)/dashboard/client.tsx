
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
import { Edit, MessageSquare } from 'lucide-react';
import { EditTaskDialog } from './edit-task-dialog';
import { CommentsSheet } from './comments-sheet';

const getStatusVariant = (status: Task['status']): 'default' | 'secondary' | 'outline' | 'destructive' => {
  switch (status) {
    case 'Completed':
    case 'Approved':
      return 'secondary';
    case 'In Progress':
    case 'Submitted for Review':
      return 'default';
    case 'Assigned':
      return 'outline';
    case 'Changes Requested':
        return 'destructive';
    default:
      return 'outline';
  }
};

export type TaskWithRelations = Task & {
  profiles: Pick<User, 'name' | 'avatar_url'> | null;
  assigner: Pick<User, 'name' | 'avatar_url'> | null;
  templates: Pick<Template, 'name' | 'description'> | null;
  primary_assignee: Pick<User, 'name' | 'avatar_url'> | null;
};

export function DashboardClient({ tasks, userRole, currentUserId }: { tasks: TaskWithRelations[], userRole: User['role'], currentUserId: string }) {
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

  const groupedByWorkflow = useMemo(() => {
    const groups: Record<string, { 
        id: string; 
        name: string; 
        description: string; 
        tasks: TaskWithRelations[]; 
        assigner: Pick<User, 'name' | 'avatar_url'> | null;
        assignee: Pick<User, 'name' | 'avatar_url'> | null;
    }> = {};

    // First, group all tasks by their workflow instance ID
    const tasksByWorkflow: Record<string, TaskWithRelations[]> = {};
    tasks.forEach(task => {
        if (!task.workflow_instance_id) return;
        if (!tasksByWorkflow[task.workflow_instance_id]) {
            tasksByWorkflow[task.workflow_instance_id] = [];
        }
        tasksByWorkflow[task.workflow_instance_id].push(task);
    });

    // Now, create the final group structures
    for (const workflowId in tasksByWorkflow) {
        const workflowTasks = tasksByWorkflow[workflowId];
        // Sort tasks by position to reliably find the first one
        workflowTasks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        
        const firstTask = workflowTasks[0];
        if (!firstTask) continue;

        const templateName = firstTask.templates?.name || 'General Tasks';
        const templateDescription = firstTask.templates?.description || 'Tasks not associated with a template.';

        // The "assignee" for the whole workflow is the primary assignee of the first task.
        const workflowAssignee = firstTask.primary_assignee;

        groups[workflowId] = {
            id: workflowId,
            name: templateName,
            description: templateDescription,
            tasks: workflowTasks,
            assigner: firstTask.assigner,
            assignee: workflowAssignee,
        };
    }

    return Object.values(groups);
  }, [tasks]);
  
  const getNextStatuses = (task: TaskWithRelations): Array<Task['status']> => {
    const isPrimaryAssignee = currentUserId === task.primary_assignee_id;
    const isReviewer = !isPrimaryAssignee && currentUserId === task.user_id;

    switch (task.status) {
        case 'Assigned':
        case 'Changes Requested':
            return isPrimaryAssignee ? ['In Progress'] : [];
        case 'In Progress':
            return isPrimaryAssignee ? ['Submitted for Review'] : [];
        case 'Submitted for Review':
            return isReviewer ? ['Approved', 'Changes Requested'] : [];
        default:
            return []; // No changes allowed for Approved/Completed tasks from dropdown
    }
  }


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

  const isTaskActive = (task: TaskWithRelations, allTasksInGroup: TaskWithRelations[]): boolean => {
    if (task.status !== 'Assigned') {
      return true;
    }
    if (task.position === 0) {
      return true;
    }
    const prevTask = allTasksInGroup.find(t => t.position === (task.position ?? 0) - 1);
    return prevTask?.status === 'Approved' || prevTask?.status === 'Completed';
  };

  if (isMobile) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader />
        {groupedByWorkflow.map(group => (
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
                                     <div className="flex flex-col text-xs text-right">
                                        <span>Assigned by</span>
                                        <span className="font-medium text-foreground">{group.assigner.name}</span>
                                    </div>
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={group.assigner.avatar_url || undefined} alt={group.assigner.name ?? ''}/>
                                        <AvatarFallback>{group.assigner.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </div>
                            )}
                            {group.assignee && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <div className="flex flex-col text-xs text-right">
                                        <span>Assigned to</span>
                                        <span className="font-medium text-foreground">{group.assignee.name}</span>
                                    </div>
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={group.assignee.avatar_url || undefined} alt={group.assignee.name ?? ''}/>
                                        <AvatarFallback>{group.assignee.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 p-4 pt-0">
                    {group.tasks.map(task => {
                        const nextStatuses = getNextStatuses(task);
                        const canUpdate = nextStatuses.length > 0;
                        const active = isTaskActive(task, group.tasks);
                        if (!active && userRole !== 'Admin') return null;
                        const displayStatus = task.status === 'Assigned' || task.status === 'Changes Requested' ? 'To Do' : task.status;

                        return (
                            <Card key={task.id} className={!active ? 'opacity-50' : ''}>
                                <CardHeader className="pb-4 flex-row items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg">{task.name}</CardTitle>
                                        {task.description && <CardDescription>{task.description}</CardDescription>}
                                    </div>
                                    <div className="flex items-center">
                                        <CommentsSheet task={task} userRole={userRole} />
                                        {userRole === 'Admin' && (
                                            <>
                                                <EditTaskDialog task={task} />
                                                <DeleteTaskDialog taskId={task.id} taskName={task.name} />
                                            </>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-center">
                                    <Badge variant={getStatusVariant(task.status)} className={task.status === 'In Progress' || task.status === 'Submitted for Review' ? 'animate-pulse' : ''}>
                                        {displayStatus}
                                    </Badge>
                                    {canUpdate && active ? (
                                        <Select
                                            onValueChange={(newStatus: Task['status']) => handleStatusChange(task.id, newStatus)}
                                            disabled={isPending}
                                            value={task.status}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                              <SelectValue placeholder={displayStatus} />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value={task.status}>{displayStatus}</SelectItem>
                                              {nextStatuses.map(status => (
                                                <SelectItem key={status} value={status}>{status}</SelectItem>
                                              ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="w-[180px] h-9 flex items-center justify-end">
                                            <span className="text-sm text-muted-foreground pr-2">
                                                {displayStatus}
                                            </span>
                                        </div>
                                    )}
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
        {groupedByWorkflow.map(group => (
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
                                    <div className="flex flex-col text-xs text-right">
                                        <span>Assigned by</span>
                                        <span className="font-medium text-foreground">{group.assigner.name}</span>
                                    </div>
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={group.assigner.avatar_url || undefined} alt={group.assigner.name ?? ''}/>
                                        <AvatarFallback>{group.assigner.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </div>
                            )}
                            {group.assignee && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <div className="flex flex-col text-xs text-right">
                                        <span>Assigned to</span>
                                        <span className="font-medium text-foreground">{group.assignee.name}</span>
                                    </div>
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={group.assignee.avatar_url || undefined} alt={group.assignee.name ?? ''}/>
                                        <AvatarFallback>{group.assignee.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
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
                            <TableHead className="text-center">Action</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {group.tasks.map(task => {
                                const nextStatuses = getNextStatuses(task);
                                const canUpdate = nextStatuses.length > 0;
                                const active = isTaskActive(task, group.tasks);
                                if (!active && userRole !== 'Admin') return null;
                                const displayStatus = task.status === 'Assigned' || task.status === 'Changes Requested' ? 'To Do' : task.status;

                                return (
                                    <TableRow key={task.id} className={!active ? 'opacity-50' : ''}>
                                        <TableCell className="font-medium max-w-xs">
                                            <p className="font-semibold truncate">{task.name}</p>
                                            {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center">
                                                <Badge variant={getStatusVariant(task.status)} className={task.status === 'In Progress' || task.status === 'Submitted for Review' ? 'animate-pulse' : ''}>
                                                {displayStatus}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-center items-center h-9">
                                            {canUpdate && active ? (
                                                <Select
                                                    onValueChange={(newStatus: Task['status']) => handleStatusChange(task.id, newStatus)}
                                                    disabled={isPending}
                                                    value={task.status}
                                                >
                                                    <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder={displayStatus} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value={task.status}>{displayStatus}</SelectItem>
                                                      {nextStatuses.map(status => (
                                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                                      ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    {displayStatus}
                                                </span>
                                            )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end">
                                                <CommentsSheet task={task} userRole={userRole} />
                                                {userRole === 'Admin' && (
                                                    <>
                                                        <EditTaskDialog task={task} />
                                                        <DeleteTaskDialog taskId={task.id} taskName={task.name} />
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
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

    