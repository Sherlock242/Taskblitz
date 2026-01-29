'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { signup } from '@/app/auth/actions';

function FormContent({ searchParams }: { searchParams: { message: string } }) {
    const { pending } = useFormStatus();

    return (
        <>
            <div className="grid gap-2">
              <Label htmlFor="full-name">Full name</Label>
              <Input 
                id="full-name" 
                name="full-name"
                placeholder="John Doe" 
                required 
                disabled={pending}
              />
            </div>
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
              <Label htmlFor="role">Role</Label>
              <Select name="role" defaultValue="Member" disabled={pending}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
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
              {pending ? 'Creating account...' : 'Create an account'}
            </Button>
        </>
    );
}

export function SignupForm({ searchParams }: { searchParams: { message: string } }) {
  return (
    <form action={signup} className="grid gap-4">
      <FormContent searchParams={searchParams} />
    </form>
  )
}
