'use client';

import { useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signup } from '@/app/auth/actions';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export function SignupForm() {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            const result = await signup(formData);
            if (result?.error) {
                toast({
                    title: 'Sign Up Failed',
                    description: result.error.message,
                    variant: 'destructive',
                });
            } else if (result?.data) {
                toast({
                    title: 'Success!',
                    description: result.data.message,
                });
                formRef.current?.reset();
                router.push('/login');
            }
            // If redirect() is called in the action, this part of the code won't be reached.
        });
    };

    return (
        <form ref={formRef} action={handleSubmit} className="grid gap-4">
             <div className="grid gap-2">
              <Label htmlFor="full-name">Full name</Label>
              <Input 
                id="full-name" 
                name="full-name"
                placeholder="John Doe" 
                required 
                disabled={isPending}
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
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                name="password"
                type="password"
                required
                minLength={6}
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue="Member" required disabled={isPending}>
                    <SelectTrigger id="role">
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Member">Member</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Creating account...' : 'Create an account'}
            </Button>
        </form>
    );
}
