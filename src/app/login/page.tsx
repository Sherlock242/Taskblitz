import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from './client';
import { Workflow } from 'lucide-react';

export default async function LoginPage({ searchParams }: { searchParams: { message?: string, error?: string } }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return redirect('/dashboard');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 font-headline font-semibold text-primary">
            <Workflow className="h-8 w-8" />
            <span className="text-3xl">Task Blitz</span>
          </div>
          <div className="pt-4">
            <CardTitle className="text-2xl font-headline">Login</CardTitle>
            <CardDescription className="pt-1">
              Enter your email below to login to your account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <LoginForm searchParams={searchParams} />
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
