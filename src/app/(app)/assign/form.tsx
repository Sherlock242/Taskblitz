"use client";

import React, { useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Template, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { assignTasks } from './actions';

export function AssignForm({ templates, users }: { templates: Template[], users: User[] }) {
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [selectedReviewer, setSelectedReviewer] = useState<string>('');
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleAssign = async () => {
        startTransition(async () => {
            const result = await assignTasks(selectedTemplate, selectedReviewer);
            if (result.error) {
                toast({
                    title: 'Error',
                    description: result.error.message,
                    variant: 'destructive',
                });
            } else if (result.data) {
                toast({
                    title: 'Success!',
                    description: result.data.message,
                });
                 setSelectedTemplate('');
                 setSelectedReviewer('');
            }
        });
    };

    const canSubmit = selectedTemplate && selectedReviewer;

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="font-headline">Start a Workflow</CardTitle>
                <CardDescription>Instantiate a task workflow from a template.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="template">Task Template</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate} disabled={isPending}>
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
                    <Label htmlFor="reviewer">Reviewer</Label>
                    <Select value={selectedReviewer} onValueChange={setSelectedReviewer} disabled={isPending}>
                        <SelectTrigger id="reviewer">
                            <SelectValue placeholder="Select who will review the work" />
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
                <Button className="w-full" onClick={handleAssign} disabled={isPending || !canSubmit}>
                    {isPending ? 'Starting...' : 'Start Workflow'}
                </Button>
            </CardFooter>
        </Card>
    );
}
