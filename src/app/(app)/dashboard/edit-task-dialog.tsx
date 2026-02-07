"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateTask } from './actions';
import type { Task } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Edit } from 'lucide-react';
import { format } from 'date-fns';

export function EditTaskDialog({ task }: { task: Task }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(task.name);
    const [description, setDescription] = useState(task.description || '');
    const [deadline, setDeadline] = useState('');
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    // When the dialog opens, reset the state from the task prop
    useEffect(() => {
        if (open) {
            setName(task.name);
            setDescription(task.description || '');
            setDeadline(task.deadline ? format(new Date(task.deadline), 'yyyy-MM-dd') : '');
        }
    }, [open, task]);
    
    const handleSubmit = async () => {
        if (!name) {
             toast({
                title: 'Validation Error',
                description: 'A task must have a name.',
                variant: 'destructive',
            });
            return;
        }

        startTransition(async () => {
            const result = await updateTask(task.id, { 
                name, 
                description, 
                deadline: deadline ? new Date(deadline).toISOString() : null 
            });

            if (result.error) {
                toast({
                    title: 'Error',
                    description: result.error.message,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Task Updated',
                    description: `The task has been saved.`
                });
                setOpen(false);
            }
        });
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit Task</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-headline">Edit Task</DialogTitle>
                    <DialogDescription>
                        Make changes to the task details below.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid items-center gap-2">
                        <Label htmlFor="name">Task Name</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="grid items-center gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="A brief description for this task."
                        />
                    </div>
                     <div className="grid items-center gap-2">
                        <Label htmlFor="deadline">Deadline</Label>
                        <Input
                            id="deadline"
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSubmit} disabled={isPending}>
                        {isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
