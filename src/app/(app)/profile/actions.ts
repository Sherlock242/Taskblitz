'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateAvatar() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: { message: 'You must be logged in to update your avatar.' } };
  }
  
  const newAvatarUrl = `https://picsum.photos/seed/${Math.random() * 1000}/200/200`;

  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: newAvatarUrl })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    return { error: { message: `Failed to update avatar: ${error.message}` } };
  }

  revalidatePath('/profile');
  revalidatePath('/(app)/layout', 'layout'); // Revalidate layout to update UserNav

  return { data };
}


export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirm-password') as string;
  
  if (password !== confirmPassword) {
    return { error: { message: 'Passwords do not match.' } };
  }
  
  if (password.length < 6) {
    return { error: { message: 'Password must be at least 6 characters long.' } };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: { message: `Failed to update password: ${error.message}` } };
  }

  return { data: { message: 'Your password has been updated successfully.' } };
}

export async function deleteAccount() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: { message: 'You must be logged in to delete your account.' } };
  }

  // This RPC call will trigger the delete_own_user_account function in the database
  const { error } = await supabase.rpc('delete_own_user_account');

  if (error) {
    return { error: { message: `Failed to delete account: ${error.message}` } };
  }
  
  // The rpc call invalidates the user's session, so we sign them out on the client
  // and redirect them. We don't need to call signOut() here as the session is gone.
  revalidatePath('/');
  redirect('/login?message=Your account has been successfully deleted.');
}
