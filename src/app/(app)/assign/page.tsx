"use client";

import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { users as initialUsers, templates as initialTemplates } from '@/lib/data';
import type { User, Template, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AssignPage() {
    // In a real app, this state would be managed globally or fetched from a server.
    // Here we just use it to show a success message.
    const [tasks, setTasks] = useState<Task[]>([]);
    
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [selectedUser, setSelectedUser] = useState<string>('');
    
    const { toast } = useToast();

    const handleAssign = () => {
        if (!selectedTemplate || !selectedUser) {
            toast({
                title: 'Error',
                description: 'Please select both a template and a user.',
                variant: 'destructive',
            });
            return;
        }

        const template = initialTemplates.find(t => t.id === selectedTemplate);
        const user = initialUsers.find(u => u.id === selectedUser);

        if (!template || !user) {
            toast({
                title: 'Error',
                description: 'Invalid template or user.',
                variant: 'destructive',
            });
            return;
        }

        const newTasks: Task[] = template.tasks.map(taskName => ({
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: taskName,
            templateId: template.id,
            userId: user.id,
            status: 'To Do',
        }));

        // This would normally update a global store or send data to a server
        setTasks(currentTasks => [...currentTasks, ...newTasks]);

        toast({
            title: 'Success!',
            description: `Assigned ${template.tasks.length} tasks from "${template.name}" to ${user.name}. View them on the dashboard.`,
        });
        
        // Reset form
        setSelectedTemplate('');
        setSelectedUser('');
    };

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
                                {initialTemplates.map(template => (
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
                                {initialUsers.map(user => (
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
