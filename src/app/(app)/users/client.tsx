"use client";

import React, { useTransition, useState, useEffect } from 'react';
import type { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateUserRole, deleteUser } from './actions';
import { createClient } from '@/lib/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';


interface UsersClientProps {
    users: User[];
    currentUserId: string;
    currentUserRole: User['role'];
}

export function UsersClient({ users: initialUsers, currentUserId, currentUserRole }: UsersClientProps) {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const isMobile = useIsMobile();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const supabase = createClient();

    useEffect(() => {
        const fetchUsers = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('name', { ascending: true });
            
            if (error) {
                toast({
                    title: 'Error fetching users',
                    description: error.message,
                    variant: 'destructive',
                });
            } else if (data) {
                setUsers(data as User[]);
            }
        };

        const channel = supabase
            .channel('realtime-users')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                (payload) => {
                    console.log('Real-time profile update received:', payload);
                    fetchUsers();
                }
            )
            .subscribe((status, err) => {
                if (err) {
                    console.error('User subscription error:', err);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, toast]);


    const handleRoleChange = (userId: string, newRole: User['role']) => {
        const originalUsers = [...users];
        setUsers(currentUsers => currentUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
        
        startTransition(async () => {
            const result = await updateUserRole(userId, newRole);
            if (result.error) {
                setUsers(originalUsers);
                toast({ title: 'Error', description: result.error.message, variant: 'destructive' });
            } else {
                toast({ title: 'Success', description: 'User role updated.' });
            }
        });
    };

    const handleUserDelete = () => {
        if (!userToDelete) return;

        const originalUsers = [...users];
        setUsers(currentUsers => currentUsers.filter(u => u.id !== userToDelete.id));
        setUserToDelete(null);

        startTransition(async () => {
            const { error } = await deleteUser(userToDelete.id);
            if (error) {
                setUsers(originalUsers);
                toast({
                    title: 'Error removing user',
                    description: error.message,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'User Removed',
                    description: `The user "${userToDelete.name}" has been removed.`,
                });
            }
        });
    };

    if (users.length === 0) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">User Management</CardTitle>
                    <CardDescription>View and manage users in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <h3 className="text-lg font-semibold">No Users Found</h3>
                        <p className="text-muted-foreground mt-2">There are no users in the system yet.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isMobile) {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold tracking-tight font-headline">User Management</h1>
                    <p className="text-muted-foreground">View and manage users in the system.</p>
                </div>
                {users.map(user => (
                    <Card key={user.id}>
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                                    <AvatarFallback>{user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <CardTitle className="text-lg">{user.name}</CardTitle>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {currentUserRole === 'Admin' && user.id !== currentUserId ? (
                                        <>
                                            <Select 
                                                defaultValue={user.role} 
                                                onValueChange={(newRole: User['role']) => handleRoleChange(user.id, newRole)}
                                                disabled={isPending}
                                            >
                                                <SelectTrigger className="w-[110px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Admin">Admin</SelectItem>
                                                    <SelectItem value="Member">Member</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button variant="ghost" size="icon" onClick={() => setUserToDelete(user)} className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                ))}
                {userToDelete && (
                    <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the user <strong>{userToDelete.name}</strong> and all of their associated data.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleUserDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                    {isPending ? 'Removing...' : 'Remove User'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        );
    }

    return (
        <>
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">User Management</CardTitle>
                <CardDescription>View and manage users in the system.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map(user => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={user.avatar_url} alt={user.name} />
                                            <AvatarFallback>{user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{user.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {currentUserRole === 'Admin' && user.id !== currentUserId ? (
                                            <>
                                                <Select 
                                                    defaultValue={user.role} 
                                                    onValueChange={(newRole: User['role']) => handleRoleChange(user.id, newRole)}
                                                    disabled={isPending}
                                                >
                                                    <SelectTrigger className="w-[120px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Admin">Admin</SelectItem>
                                                        <SelectItem value="Member">Member</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button variant="ghost" size="icon" onClick={() => setUserToDelete(user)} className="text-destructive hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'} className="capitalize">{user.role}</Badge>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        {userToDelete && (
            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user <strong>{userToDelete.name}</strong> and all of their associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUserDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            {isPending ? 'Removing...' : 'Remove User'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
        </>
    );
}
