"use client";

import type { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRef, useTransition, useState } from 'react';
import { updateAvatar, updatePassword, deleteAccount, updateProfile } from './actions';
import { useRouter } from 'next/navigation';
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
    const router = useRouter();
    const [isAvatarPending, startAvatarTransition] = useTransition();
    const [isPasswordPending, startPasswordTransition] = useTransition();
    const [isDeletePending, startDeleteTransition] = useTransition();
    const [isProfilePending, startProfileTransition] = useTransition();
    const passwordFormRef = useRef<HTMLFormElement>(null);
    const profileFormRef = useRef<HTMLFormElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Maintain local state for the avatar URL to ensure immediate updates
    const [avatarUrl, setAvatarUrl] = useState(user.avatar_url);

    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        startAvatarTransition(async () => {
            const formData = new FormData();
            formData.append('avatar', file);

            const result = await updateAvatar(formData);
            if (result.error) {
                toast({ title: 'Error uploading avatar', description: result.error.message, variant: 'destructive' });
            } else if (result.data) {
                toast({ title: 'Avatar Updated!', description: 'Your new avatar has been uploaded.' });
                // Update local state immediately with a unique timestamp to bust cache
                setAvatarUrl(result.data.avatar_url);
                // Trigger a refresh to sync with other components
                router.refresh();
            }
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        });
    };

    const handleUpdateProfile = (formData: FormData) => {
        startProfileTransition(async () => {
            const result = await updateProfile(formData);
            if (result.error) {
                toast({ title: 'Error', description: result.error.message, variant: 'destructive' });
            } else if (result.data) {
                toast({ title: 'Profile Updated!', description: result.data.message });
                router.refresh();
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
            await deleteAccount();
        });
    };

    const userInitials = user.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    return (
        <div className="grid gap-6">
            {/* Profile Card */}
            <Card>
                <form action={handleUpdateProfile} ref={profileFormRef}>
                    <CardHeader>
                        <CardTitle className="font-headline">Profile Information</CardTitle>
                        <CardDescription>Update your photo and personal details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-6">
                            {/* Using a key here forces the entire Avatar component to re-mount when the URL changes */}
                            <Avatar key={avatarUrl} className="h-24 w-24 border">
                                <AvatarImage src={avatarUrl} alt={user.name} />
                                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid gap-2 w-full">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" name="name" defaultValue={user.name} required disabled={isProfilePending} />
                                <div className="flex flex-col gap-1 mt-1">
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">Role: {user.role}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4 flex justify-between">
                         <div>
                            <Input
                                id="avatar-upload"
                                name="avatar"
                                type="file"
                                accept="image/png, image/jpeg"
                                onChange={handleAvatarChange}
                                className="hidden"
                                ref={fileInputRef}
                                disabled={isAvatarPending}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isAvatarPending}
                            >
                                {isAvatarPending ? 'Uploading...' : 'Upload New Avatar'}
                            </Button>
                        </div>
                        <Button type="submit" disabled={isProfilePending}>
                            {isProfilePending ? 'Saving...' : 'Save Name'}
                        </Button>
                    </CardFooter>
                </form>
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