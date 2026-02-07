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
import { Edit, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function EditTaskDialog({ task }: { task: Task }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(task.name);
    const [description, setDescription] = useState(task.description || '');
    const [deadline, setDeadline] = useState<Date | undefined>(task.deadline ? new Date(task.deadline) : undefined);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (open) {
            setName(task.name);
            setDescription(task.description || '');
            setDeadline(task.deadline ? new Date(task.deadline) : undefined);
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
                deadline: deadline ? deadline.toISOString() : null 
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
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !deadline && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {deadline ? format(deadline, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={deadline}
                                onSelect={(date) => {
                                    setDeadline(date);
                                    setCalendarOpen(false);
                                }}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
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
