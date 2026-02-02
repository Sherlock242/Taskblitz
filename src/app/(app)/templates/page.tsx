import { createClient } from '@/lib/supabase/server';
import type { Template, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { ListChecks, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';
import { AddTemplateDialog } from './dialog';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DeleteTemplateDialog } from './delete-template-dialog';

async function TemplatesList({ users }: { users: Pick<User, 'id' | 'name'>[] }) {
    const supabase = createClient();
    const { data: templates, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching templates', error);
        return <p className="text-destructive">Could not load templates.</p>
    }

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
            {(templates as Template[]).map(template => (
                <Card key={template.id}>
                    <CardHeader>
                        <CardTitle className="font-headline">{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {template.tasks.slice(0, 5).map((task, index) => (
                                <li key={index} className="flex items-center gap-2">
                                    <ListChecks className="h-4 w-4 text-primary" />
                                    <span className="flex-1 truncate">{task.name}</span>
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
                            <DeleteTemplateDialog templateId={template.id} templateName={template.name} />
                        </div>
                    </CardFooter>
                </Card>
            ))}
        </>
    );
}

function TemplatesSkeleton() {
    return (
       <>
            <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div></CardContent><CardFooter><Skeleton className="h-4 w-1/4" /></CardFooter></Card>
            <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div></CardContent><CardFooter><Skeleton className="h-4 w-1/4" /></CardFooter></Card>
            <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div></CardContent><CardFooter><Skeleton className="h-4 w-1/4" /></CardFooter></Card>
        </>
    );
}

export default async function TemplatesPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    if (profile?.role !== 'Admin') {
        redirect('/dashboard');
    }

    const { data: usersData, error: usersError } = await supabase.from('profiles').select('id, name');

    const users = usersError ? [] : usersData as Pick<User, 'id' | 'name'>[];
    
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight font-headline">Task Templates</h1>
                    <p className="text-muted-foreground">Create and manage your reusable task lists.</p>
                </div>
                {profile?.role === 'Admin' && <AddTemplateDialog users={users} />}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Suspense fallback={<TemplatesSkeleton />}>
                    <TemplatesList users={users} />
                </Suspense>
            </div>
        </div>
    );
}
