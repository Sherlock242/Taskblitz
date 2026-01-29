'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword } from '@/app/auth/actions'
import { Skeleton } from '@/components/ui/skeleton'

export function ResetPasswordForm({ searchParams }: { searchParams: { message?: string; error?: string } }) {
  const [isSession, setIsSession] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let recoveryEventFired = false;
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
            recoveryEventFired = true;
            setIsSession(true);
            setLoading(false);
        }
    });

    // If after a short delay the event hasn't fired, assume no valid token.
    const timer = setTimeout(() => {
        if (!recoveryEventFired) {
            setLoading(false);
        }
    }, 1500);

    return () => {
        subscription.unsubscribe();
        clearTimeout(timer);
    };
  }, []);
  
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
    <form action={resetPassword} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm-password">Confirm New Password</Label>
        <Input
          id="confirm-password"
          name="confirm-password"
          type="password"
          required
        />
      </div>
      {searchParams.error && (
        <div className="text-sm font-medium text-destructive p-2 bg-destructive/10 rounded-md border border-destructive/20">
          {searchParams.error}
        </div>
      )}
      <Button type="submit" className="w-full">
        Reset Password
      </Button>
    </form>
  )
}
