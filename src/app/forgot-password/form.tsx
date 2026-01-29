"use client";

import { useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestPasswordReset } from '@/app/auth/actions';
import { useToast } from '@/hooks/use-toast';

export function ForgotPasswordForm() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            const result = await requestPasswordReset(formData);
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
                formRef.current?.reset();
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
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
    );
}
