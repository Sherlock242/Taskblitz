'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestPasswordReset } from '@/app/auth/actions';

function FormContent({ searchParams }: { searchParams: { message?: string, error?: string } }) {
    const { pending } = useFormStatus();

    return (
        <>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
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
              {pending ? 'Sending...' : 'Send Reset Link'}
            </Button>
        </>
    );
}

export function ForgotPasswordForm({ searchParams }: { searchParams: { message?: string, error?: string } }) {
  return (
    <form action={requestPasswordReset} className="grid gap-4">
      <FormContent searchParams={searchParams} />
    </form>
  )
}
