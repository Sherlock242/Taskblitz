"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Template, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { ListChecks, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddTemplateDialog } from './dialog';
import { deleteTemplate } from './actions';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface TemplatesClientProps {
    initialTemplates: Template[];
    users: Pick<User, 'id' | 'name'>[];
}

export function TemplatesClient({ initialTemplates, users }: TemplatesClientProps) {
    const [templates, setTemplates] = useState<Template[]>(initialTemplates);
    const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
    const [isTransitioning, startTransition] = useTransition();
    const { toast } = useToast();
    const supabase = createClient();

    useEffect(() => {
        const fetchTemplates = async () => {
            const { data, error } = await supabase
                .from('templates')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (data) {
                setTemplates(data as Template[]);
            }
        };

        const channel = supabase
            .channel('realtime-templates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'templates' },
                (payload) => {
                    console.log('Real-time template update received:', payload);
                    fetchTemplates();
                }
            )
            .subscribe((status, err) => {
                if (err) {
                    console.error('Template subscription error:', err);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    const handleTemplateDelete = () => {
        if (!templateToDelete) return;

        const originalTemplates = [...templates];
        setTemplates(currentTemplates => currentTemplates.filter(t => t.id !== templateToDelete.id));
        setTemplateToDelete(null);

        startTransition(async () => {
            const { error } = await deleteTemplate(templateToDelete.id);
            if (error) {
                setTemplates(originalTemplates);
                toast({
                    title: 'Error deleting template',
                    description: error.message,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Template Deleted',
                    description: `The "${templateToDelete.name}" template has been deleted.`,
                });
            }
        });
    };
    
    if (templates.length === 0) {
        return (
            <div className="text-center py-10 border-2 border-dashed rounded-lg col-span-full">
                <h3 className="text-lg font-semibold">No Templates Yet</h3>
                <p className="text-muted-foreground mt-2">Create your first template to get started.</p>
            </div>
        )
    }

    const userMap = new Map(users.map(u => [u.id, u.name]));

    return (
        <>
            {templates.map(template => (
                <Card key={template.id}>
                    <CardHeader>
                        <CardTitle className="font-headline">{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {template.tasks.slice(0, 5).map((task, index) => (
                                <li key={index} className="flex items-center gap-3">
                                    <ListChecks className="h-4 w-4 text-primary" />
                                    <span className="flex-1 truncate">{task.name}</span>
                                     {task.deadline_days && (
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {task.deadline_days} days
                                        </span>
                                    )}
                                    {task.role ? (
                                        <span className="text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded-full">
                                            {task.role} ({userMap.get(task.user_id) || 'Unknown'})
                                        </span>
                                    ) : (
                                        <span className="text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded-full">
                                            {userMap.get(task.user_id) || 'Unknown User'}
                                        </span>
                                    )}
                                </li>
                            ))}
                            {template.tasks.length > 5 && (
                                <li className="text-xs italic">...and {template.tasks.length - 5} more.</li>
                            )}
                        </ul>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">{template.tasks.length} tasks</p>
                        <div className="flex items-center">
                            <AddTemplateDialog template={template} users={users}>
                                <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit Template</span>
                                </Button>
                            </AddTemplateDialog>
                            <Button variant="ghost" size="icon" onClick={() => setTemplateToDelete(template)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete Template</span>
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            ))}
             {templateToDelete && (
                <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the <strong>{templateToDelete.name}</strong> template and any associated data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isTransitioning}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleTemplateDelete} disabled={isTransitioning} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                {isTransitioning ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
