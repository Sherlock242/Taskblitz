'use client'

import { useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword } from '@/app/auth/actions'
import { Skeleton } from '@/components/ui/skeleton'

function FormContent({ searchParams }: { searchParams: { message?: string; error?: string } }) {
  const { pending } = useFormStatus()

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          disabled={pending}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm-password">Confirm New Password</Label>
        <Input
          id="confirm-password"
          name="confirm-password"
          type="password"
          required
          disabled={pending}
        />
      </div>
      {searchParams.message && (
        <div className="text-sm font-medium text-primary p-2 bg-primary/10 rounded-md border border-primary/20">
          {searchParams.message}
        </div>
      )}
      {searchParams.error && (
        <div className="text-sm font-medium text-destructive p-2 bg-destructive/10 rounded-md border border-destructive/20">
          {searchParams.error}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Resetting...' : 'Reset Password'}
      </Button>
    </>
  )
}

export function ResetPasswordForm({ searchParams }: { searchParams: { message?: string; error?: string } }) {
  const [isSession, setIsSession] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsSession(true)
          setLoading(false)
        } else if (event === "SIGNED_IN") {
          // This can happen if the user is already logged in
          // And somehow navigates here.
           setIsSession(true)
           setLoading(false)
        } else {
            setLoading(false)
        }
      }
    )

    // Check if there is already a session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            setIsSession(true);
        }
        setLoading(false);
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])
  
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
      <FormContent searchParams={searchParams} />
    </form>
  )
}
