import { createClient } from '@/lib/supabase/server';
import type { Template, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardFooter, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';
import { AddTemplateDialog } from './dialog';
import { redirect } from 'next/navigation';
import { TemplatesClient } from './client';

async function TemplatesData({ users }: { users: Pick<User, 'id' | 'name'>[] }) {
    const supabase = createClient();
    const { data: templates, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching templates', error);
        return <p className="text-destructive">Could not load templates.</p>
    }

    return <TemplatesClient initialTemplates={templates as Template[]} users={users} />;
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
                    <TemplatesData users={users} />
                </Suspense>
            </div>
        </div>
    );
}
