"use client";

import type { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRef, useTransition } from 'react';
import { updateAvatar, updatePassword, deleteAccount } from './actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function ProfileClient({ user }: { user: User }) {
    const { toast } = useToast();
    const [isAvatarPending, startAvatarTransition] = useTransition();
    const [isPasswordPending, startPasswordTransition] = useTransition();
    const [isDeletePending, startDeleteTransition] = useTransition();
    const passwordFormRef = useRef<HTMLFormElement>(null);

    const handleUpdateAvatar = () => {
        startAvatarTransition(async () => {
            const result = await updateAvatar();
            if (result.error) {
                toast({ title: 'Error', description: result.error.message, variant: 'destructive' });
            } else {
                toast({ title: 'Avatar Updated!', description: 'Your new avatar has been set.' });
            }
        });
    };

    const handleUpdatePassword = (formData: FormData) => {
        startPasswordTransition(async () => {
            const result = await updatePassword(formData);
            if (result.error) {
                toast({ title: 'Error', description: result.error.message, variant: 'destructive' });
            } else if (result.data) {
                toast({ title: 'Password Updated!', description: result.data.message });
                passwordFormRef.current?.reset();
            }
        });
    };

    const handleDeleteAccount = () => {
        startDeleteTransition(async () => {
            // This action redirects, so we don't need to handle the result here.
            // Errors will be caught by Next.js error boundaries.
            await deleteAccount();
        });
    };

    return (
        <div className="grid gap-6">
            {/* Profile Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Profile Information</CardTitle>
                    <CardDescription>Update your photo and personal details.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={user.avatar_url} alt={user.name} />
                            <AvatarFallback>{user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-1">
                            <p className="text-lg font-semibold">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <p className="text-sm text-muted-foreground capitalize">Role: {user.role}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button onClick={handleUpdateAvatar} disabled={isAvatarPending}>
                        {isAvatarPending ? 'Generating...' : 'Generate New Avatar'}
                    </Button>
                </CardFooter>
            </Card>

            {/* Change Password Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Change Password</CardTitle>
                    <CardDescription>Enter a new password for your account.</CardDescription>
                </CardHeader>
                <form action={handleUpdatePassword} ref={passwordFormRef}>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input id="password" name="password" type="password" required disabled={isPasswordPending}/>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input id="confirm-password" name="confirm-password" type="password" required disabled={isPasswordPending} />
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button type="submit" disabled={isPasswordPending}>
                            {isPasswordPending ? 'Updating...' : 'Update Password'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            {/* Delete Account Card */}
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="font-headline text-destructive">Delete Account</CardTitle>
                    <CardDescription>Permanently delete your account and all associated data.</CardDescription>
                </CardHeader>
                <CardFooter className="bg-destructive/5 border-t border-destructive/20 px-6 py-4">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isDeletePending}>
                                {isDeletePending ? 'Deleting...' : 'Delete My Account'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your
                                account and remove all your data from our servers.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeletePending}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteAccount}
                                disabled={isDeletePending}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                                {isDeletePending ? 'Deleting...' : 'Yes, delete my account'}
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </div>
    );
}
