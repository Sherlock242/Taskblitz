import { createClient } from '@/lib/supabase/server';
import type { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';
import { UsersClient } from './client';

async function UsersData() {
    const supabase = createClient();
    const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });
    
    if (error) {
        console.error('Error fetching users:', error);
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">User Management</CardTitle>
                    <CardDescription>View and manage users in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive text-center py-4">Could not load users.</p>
                </CardContent>
            </Card>
        );
    }

    return <UsersClient users={users as User[]} />;
}

function UsersSkeleton() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">User Management</CardTitle>
                <CardDescription>View and manage users in the system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </CardContent>
        </Card>
    );
}

export default function UsersPage() {
    return (
        <Suspense fallback={<UsersSkeleton />}>
            <UsersData />
        </Suspense>
    );
}
