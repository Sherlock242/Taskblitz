"use client";

import React, { useTransition } from 'react';
import type { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateUserRole } from './actions';
import { DeleteUserDialog } from './delete-user-dialog';


interface UsersClientProps {
    users: User[];
    currentUserId: string;
    currentUserRole: User['role'];
}

export function UsersClient({ users, currentUserId, currentUserRole }: UsersClientProps) {
    const isMobile = useIsMobile();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleRoleChange = (userId: string, newRole: User['role']) => {
        startTransition(async () => {
            const result = await updateUserRole(userId, newRole);
            if (result.error) {
                toast({ title: 'Error', description: result.error.message, variant: 'destructive' });
            } else {
                toast({ title: 'Success', description: 'User role updated.' });
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
                                            <DeleteUserDialog userId={user.id} userName={user.name} />
                                        </>
                                    ) : (
                                        <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        );
    }

    return (
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
                                                <DeleteUserDialog userId={user.id} userName={user.name} />
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
    );
}
