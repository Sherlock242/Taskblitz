'use client'

import { useTransition, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/app/auth/actions'
import { useToast } from '@/hooks/use-toast'

export function LoginForm({ searchParams }: { searchParams: { message?: string, error?: string } }) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (searchParams?.message) {
      toast({
        title: 'Success!',
        description: searchParams.message,
      });
    }
  }, [searchParams, toast]);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) {
        toast({
          title: 'Login Failed',
          description: result.error.message,
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="grid gap-4">
       <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="m@example.com"
          required
          disabled={isPending}
        />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="ml-auto inline-block text-sm underline"
          >
            Forgot your password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          disabled={isPending}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  )
}
