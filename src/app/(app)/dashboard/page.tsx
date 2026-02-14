
import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from './client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import React from 'react';
import { redirect } from 'next/navigation';
import type { User } from '@/lib/types';


export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching profile', profileError);
    return (
        <Card>
            <CardHeader>
                <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-destructive text-center">Could not load your profile. Please try again.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <DashboardClient 
      userRole={profile.role as User['role']} 
      currentUserId={user.id} 
    />
  );
}
