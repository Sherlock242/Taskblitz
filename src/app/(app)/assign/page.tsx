"use client";

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { User, Template } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export default function AssignPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [selectedUser, setSelectedUser] = useState<string>('');
    
    const { toast } = useToast();
    const supabase = createClient();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [templatesRes, usersRes] = await Promise.all([
                supabase.from('templates').select('*'),
                supabase.from('profiles').select('*')
            ]);

            if (templatesRes.error || usersRes.error) {
                toast({ title: 'Error', description: 'Could not fetch data.', variant: 'destructive' });
            } else {
                setTemplates(templatesRes.data as Template[]);
                setUsers(usersRes.data as User[]);
            }
            setLoading(false);
        };
        fetchData();
    }, [toast, supabase]);

    const handleAssign = async () => {
        if (!selectedTemplate || !selectedUser) {
            toast({
                title: 'Error',
                description: 'Please select both a template and a user.',
                variant: 'destructive',
            });
            return;
        }

        const template = templates.find(t => t.id === selectedTemplate);
        const user = users.find(u => u.id === selectedUser);

        if (!template || !user) {
            toast({
                title: 'Error',
                description: 'Invalid template or user.',
                variant: 'destructive',
            });
            return;
        }

        const newTasks = template.tasks.map(taskName => ({
            name: taskName,
            template_id: template.id,
            user_id: user.id,
            status: 'To Do',
        }));

        const { error } = await supabase.from('tasks').insert(newTasks);

        if (error) {
            toast({
                title: 'Error assigning tasks',
                description: error.message,
                variant: 'destructive',
            });
        } else {
            toast({
                title: 'Success!',
                description: `Assigned ${template.tasks.length} tasks from "${template.name}" to ${user.name}. View them on the dashboard.`,
            });
        }
        
        setSelectedTemplate('');
        setSelectedUser('');
    };

    if (loading) {
        return (
             <div className="flex justify-center items-start pt-8">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="font-headline">Instant Assignment</CardTitle>
                        <CardDescription>Quickly assign a full template of tasks to a user.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                           <Skeleton className="h-5 w-24" />
                           <Skeleton className="h-10 w-full" />
                        </div>
                         <div className="grid gap-2">
                           <Skeleton className="h-5 w-16" />
                           <Skeleton className="h-10 w-full" />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-10 w-full" />
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex justify-center items-start pt-8">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="font-headline">Instant Assignment</CardTitle>
                    <CardDescription>Quickly assign a full template of tasks to a user.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="template">Task Template</Label>
                        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                            <SelectTrigger id="template">
                                <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent>
                                {templates.map(template => (
                                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="user">User</Label>
                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                            <SelectTrigger id="user">
                                <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handleAssign}>Assign Tasks</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
