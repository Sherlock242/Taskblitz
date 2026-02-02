"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { addTemplate, updateTemplate } from './actions';
import type { Template, User } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TaskItem = { name: string; user_id: string };

export function AddTemplateDialog({ template, children, users }: { template?: Template, children?: React.ReactNode, users: Pick<User, 'id' | 'name'>[] }) {
    const isEditMode = !!template;
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [tasks, setTasks] = useState<TaskItem[]>([{ name: '', user_id: '' }]);
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (open) {
            if (isEditMode && template) {
                setName(template.name);
                setDescription(template.description || '');
                setTasks(template.tasks.length > 0 ? template.tasks : [{ name: '', user_id: '' }]);
            } else {
                setName('');
                setDescription('');
                setTasks([{ name: '', user_id: '' }]);
            }
        }
    }, [open, template, isEditMode]);
    
    const handleTaskChange = (index: number, field: 'name' | 'user_id', value: string) => {
        const newTasks = [...tasks];
        newTasks[index] = { ...newTasks[index], [field]: value };
        setTasks(newTasks);
    };

    const addTask = () => setTasks([...tasks, { name: '', user_id: '' }]);
    
    const removeTask = (index: number) => {
        if (tasks.length > 1) {
            setTasks(tasks.filter((_, i) => i !== index));
        }
    };
    
    const handleSubmit = async () => {
        const filteredTasks = tasks.map(t => ({ name: t.name.trim(), user_id: t.user_id })).filter(t => t.name && t.user_id);
        if (!name || filteredTasks.length === 0) {
             toast({
                title: 'Validation Error',
                description: 'A template must have a name and at least one task with a user assigned.',
                variant: 'destructive',
            });
            return;
        }

        startTransition(async () => {
            const result = isEditMode && template
                ? await updateTemplate(template.id, name, description, filteredTasks)
                : await addTemplate(name, description, filteredTasks);

            if (result.error) {
                toast({
                    title: 'Error',
                    description: result.error.message,
                    variant: 'destructive',
                });
            } else if (result.data) {
                toast({
                    title: isEditMode ? 'Template Updated' : 'Template Created',
                    description: `The "${(result.data as Template).name}" template has been saved.`
                });
                setOpen(false);
            }
        });
    };
    
    const trigger = children || (
        <Button size="sm" className="h-8 gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Create Template</span>
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-headline">{isEditMode ? 'Edit Template' : 'Create New Template'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Editing the "${template?.name}" template.` : 'Define a reusable and sequential set of tasks.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid items-center gap-2">
                        <Label htmlFor="name">Template Name</Label>
                        <Input id="name" name="name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="grid items-center gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="A brief description for this template."
                        />
                    </div>
                    <div className="grid items-center gap-2">
                        <Label>Tasks (in sequential order)</Label>
                        <ScrollArea className="h-56 pr-4">
                            <div className="space-y-3">
                                {tasks.map((task, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-muted-foreground">{index + 1}.</span>
                                        <Input value={task.name} onChange={e => handleTaskChange(index, 'name', e.target.value)} placeholder={`Task Name`} className="flex-1" />
                                        <Select value={task.user_id} onValueChange={value => handleTaskChange(index, 'user_id', value)}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Assign to..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {users.map(user => (
                                                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTask(index)} disabled={tasks.length <= 1}>
                                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <Button type="button" variant="outline" size="sm" onClick={addTask} className="mt-2">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Task
                        </Button>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSubmit} disabled={isPending}>
                        {isPending ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Template')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
