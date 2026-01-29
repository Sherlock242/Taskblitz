'use client'

import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/app/auth/actions'

function FormContent({ searchParams }: { searchParams: { message: string } }) {
  const { pending } = useFormStatus()

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
      <div className="grid gap-2">
        <div className="flex items-center">
          <Label htmlFor="password">Password</Label>
          <Link
            href="#"
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
          disabled={pending}
        />
      </div>
      {searchParams.message && (
        <div className="text-sm font-medium text-destructive p-2 bg-destructive/10 rounded-md border border-destructive/20">
          {searchParams.message}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Logging in...' : 'Login'}
      </Button>
    </>
  )
}

export function LoginForm({ searchParams }: { searchParams: { message: string } }) {
  return (
    <form action={login} className="grid gap-4">
      <FormContent searchParams={searchParams} />
    </form>
  )
}
