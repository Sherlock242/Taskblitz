"use server";

import { createClient } from '@/lib/supabase/server';
import type { User } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function updateUserRole(userId: string, role: User['role']) {
    const supabase = createClient();
    
    // Check if current user is an Admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
        return { error: { message: 'You must be logged in.' } };
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
    if (profile?.role !== 'Admin') {
        return { error: { message: 'Only admins can change user roles.' } };
    }
    
    if (currentUser.id === userId) {
        return { error: { message: 'Admins cannot change their own role.' } };
    }

    // Update the user's role in the profiles table
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);

    if (error) {
        return { error: { message: error.message } };
    }

    revalidatePath('/users');
    return { data: { message: 'User role updated.' } };
}
