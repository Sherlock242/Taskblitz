"use client"

import { useEffect, useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword } from '@/app/auth/actions'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

export function ResetPasswordForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSession, setIsSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Per Supabase docs, the password reset link is a magic link that logs the user in.
    // We listen for the SIGNED_IN event to know when it's safe to show the form.
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            setIsSession(true);
            setLoading(false);
            // We can unsubscribe now that we have what we need.
            subscription.unsubscribe();
        }
    });

    // Also check for an existing session in case the event fired before the listener was attached.
    const checkSession = async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
            setIsSession(true);
            setLoading(false);
            subscription.unsubscribe();
        }
    }
    checkSession();

    // Add a fallback timer. If after 3 seconds we still don't have a session,
    // assume the link is invalid. This handles expired links.
    const timer = setTimeout(() => {
        setLoading(false);
    }, 3000);

    return () => {
        subscription.unsubscribe();
        clearTimeout(timer);
    };
  }, []);
  
  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await resetPassword(formData);
      if (result?.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
      } else if (result?.data) {
        toast({
          title: 'Success!',
          description: result.data.message,
        });
        router.push('/login');
      }
    });
  };

  if (loading) {
      return (
          <div className="grid gap-4">
              <div className="grid gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
          </div>
      )
  }

  if (!isSession) {
    return (
      <div className="text-sm font-medium text-destructive p-2 bg-destructive/10 rounded-md border border-destructive/20">
        Invalid or expired password reset link. Please request a new one.
      </div>
    )
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          disabled={isPending}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm-password">Confirm New Password</Label>
        <Input
          id="confirm-password"
          name="confirm-password"
          type="password"
          required
          disabled={isPending}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Resetting...' : 'Reset Password'}
      </Button>
    </form>
  )
}
