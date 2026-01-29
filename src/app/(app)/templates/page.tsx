import { createClient } from '@/lib/supabase/server';
import type { Template } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ListChecks } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';
import { AddTemplateDialog } from './dialog';

async function TemplatesList() {
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

    return (
        <>
            {(templates as Template[]).map(template => (
                <Card key={template.id}>
                    <CardHeader>
                        <CardTitle className="font-headline">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {template.tasks.slice(0, 5).map((task, index) => (
                                <li key={index} className="flex items-center gap-2">
                                    <ListChecks className="h-4 w-4 text-primary" />
                                    <span>{task}</span>
                                </li>
                            ))}
                            {template.tasks.length > 5 && (
                                <li className="text-xs italic">...and {template.tasks.length - 5} more.</li>
                            )}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <p className="text-xs text-muted-foreground">{template.tasks.length} tasks</p>
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
    // Non-null assertion is safe because this page is protected by layout
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
    
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight font-headline">Task Templates</h1>
                    <p className="text-muted-foreground">Create and manage your reusable task lists.</p>
                </div>
                {profile?.role === 'Admin' && <AddTemplateDialog />}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Suspense fallback={<TemplatesSkeleton />}>
                    <TemplatesList />
                </Suspense>
            </div>
        </div>
    );
}
