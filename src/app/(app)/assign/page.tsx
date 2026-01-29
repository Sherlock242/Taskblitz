import { createClient } from '@/lib/supabase/server';
import { AssignForm } from './form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';
import type { Template, User } from '@/lib/types';
import { redirect } from 'next/navigation';


async function AssignData() {
    const supabase = createClient();
    const [templatesRes, usersRes] = await Promise.all([
        supabase.from('templates').select('*'),
        supabase.from('profiles').select('*')
    ]);

    if (templatesRes.error || usersRes.error) {
        return <p className="text-destructive text-center">Could not load data for assignment.</p>
    }

    return <AssignForm templates={templatesRes.data as Template[]} users={usersRes.data as User[]} />;
}

function AssignSkeleton() {
    return (
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
    );
}


export default async function AssignPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'Admin') {
    redirect('/dashboard');
  }

  return (
    <div className="flex justify-center items-start pt-8">
      <Suspense fallback={<AssignSkeleton />}>
        <AssignData />
      </Suspense>
    </div>
  );
}
