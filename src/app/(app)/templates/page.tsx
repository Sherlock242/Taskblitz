"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/auth-provider';
import type { Template } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListChecks, PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';


function AddTemplateDialog({ onAddTemplate }: { onAddTemplate: (template: Omit<Template, 'id'>) => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [tasks, setTasks] = useState<string[]>(['']);
    const { toast } = useToast();

    const handleTaskChange = (index: number, value: string) => {
        const newTasks = [...tasks];
        newTasks[index] = value;
        setTasks(newTasks);
    };

    const addTask = () => setTasks([...tasks, '']);
    const removeTask = (index: number) => {
        if (tasks.length > 1) {
            setTasks(tasks.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = () => {
        const filteredTasks = tasks.map(t => t.trim()).filter(t => t !== '');
        if (name && filteredTasks.length > 0) {
            onAddTemplate({ name, tasks: filteredTasks });
            setOpen(false);
            setName('');
            setTasks(['']);
        } else {
            toast({
                title: 'Validation Error',
                description: 'A template must have a name and at least one task.',
                variant: 'destructive',
            });
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Create Template</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-headline">Create New Template</DialogTitle>
                    <DialogDescription>Define a reusable set of tasks.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid items-center gap-2">
                        <Label htmlFor="name">Template Name</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="grid items-center gap-2">
                        <Label>Tasks</Label>
                        <ScrollArea className="h-48 pr-4">
                            <div className="space-y-2">
                                {tasks.map((task, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input value={task} onChange={e => handleTaskChange(index, e.target.value)} placeholder={`Task ${index + 1}`} />
                                        <Button variant="ghost" size="icon" onClick={() => removeTask(index)} disabled={tasks.length <= 1}>
                                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <Button variant="outline" size="sm" onClick={addTask} className="mt-2">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Task
                        </Button>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit}>Create Template</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();
    
    const fetchTemplates = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching templates', error);
            toast({ title: 'Error', description: 'Could not fetch templates.', variant: 'destructive' });
        } else {
            setTemplates(data as Template[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTemplates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const handleAddTemplate = async (newTemplate: Omit<Template, 'id'>) => {
        const { data, error } = await supabase
            .from('templates')
            .insert([newTemplate])
            .select();

        if (error) {
            toast({ title: 'Error creating template', description: error.message, variant: 'destructive' });
        } else if (data) {
            setTemplates(current => [data[0] as Template, ...current]);
            toast({ title: 'Template Created', description: `The "${data[0].name}" template has been saved.` });
        }
    };
    
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight font-headline">Task Templates</h1>
                    <p className="text-muted-foreground">Create and manage your reusable task lists.</p>
                </div>
                {user?.role === 'Admin' && <AddTemplateDialog onAddTemplate={handleAddTemplate} />}
            </div>
            {loading ? (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div></CardContent><CardFooter><Skeleton className="h-4 w-1/4" /></CardFooter></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div></CardContent><CardFooter><Skeleton className="h-4 w-1/4" /></CardFooter></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div></CardContent><CardFooter><Skeleton className="h-4 w-1/4" /></CardFooter></Card>
                 </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map(template => (
                        <Card key={template.id}>
                            <CardHeader>
                                <CardTitle className="font-headline">{template.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {template.tasks.map((task, index) => (
                                        <li key={index} className="flex items-center gap-2">
                                            <ListChecks className="h-4 w-4 text-primary" />
                                            <span>{task}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <p className="text-xs text-muted-foreground">{template.tasks.length} tasks</p>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
