import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requestPasswordReset } from '@/app/auth/actions';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage({ searchParams }: { searchParams: { message?: string, error?: string } }) {

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={requestPasswordReset} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
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
            <Button type="submit" className="w-full">
              Send Reset Link
            </Button>
          </form>
           <div className="mt-4 text-center text-sm">
            Remembered your password?{' '}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
