'use client'

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
    const supabase = createClient();
    
    // Supabase client library automatically handles the URL hash.
    // The `onAuthStateChange` listener will fire with a `PASSWORD_RECOVERY` event
    // if the user has followed a valid password reset link.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
            setIsSession(true);
            setLoading(false);
        }
    });

    // As a fallback, if the `PASSWORD_RECOVERY` event does not fire after a
    // few seconds, we assume the link is invalid or has expired. This prevents
    // the user from being stuck on a loading screen indefinitely.
    const timer = setTimeout(() => {
        setLoading(false);
    }, 2500);

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
