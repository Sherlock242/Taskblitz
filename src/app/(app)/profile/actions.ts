'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateProfile(formData: FormData) {
  const name = formData.get('name') as string;
  if (!name.trim()) {
    return { error: { message: 'Name cannot be empty.' } };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: { message: 'You must be logged in to update your profile.' } };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ name: name.trim() })
    .eq('id', user.id);

  if (error) {
    return { error: { message: `Failed to update profile: ${error.message}` } };
  }
  
  revalidatePath('/', 'layout');
  revalidatePath('/profile');
  revalidatePath('/dashboard');

  return { data: { message: 'Profile updated successfully.' } };
}

export async function updateAvatar(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: { message: 'You must be logged in to update your avatar.' } };
  }
  
  const avatarFile = formData.get('avatar') as File;
  if (!avatarFile || avatarFile.size === 0) {
      return { error: { message: 'No file selected for upload.' } };
  }

  const fileExt = avatarFile.name.split('.').pop() || 'jpg';
  // Standardize the file path to [userId]/avatar.[ext]
  const filePath = `${user.id}/avatar.${fileExt}`;

  // Upload the file. Upsert ensures we overwrite the old one.
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, avatarFile, {
      cacheControl: '0',
      upsert: true
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return { error: { message: `Failed to upload avatar: ${uploadError.message}. Make sure the 'avatars' bucket exists and is public.` } };
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);

  if (!urlData.publicUrl) {
    return { error: { message: 'Could not get public URL for avatar.' } };
  }
  
  // Append a timestamp to the URL to force the browser to ignore its cache
  const uniqueUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: uniqueUrl })
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) {
    return { error: { message: `Failed to update profile database record: ${updateError.message}` } };
  }

  // Aggressive revalidation to update headers and other pages
  revalidatePath('/', 'layout');
  revalidatePath('/profile');
  revalidatePath('/dashboard');
  revalidatePath('/users');

  return { data: updatedProfile };
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

  const { error } = await supabase.rpc('delete_own_user_account');

  if (error) {
    return { error: { message: `Failed to delete account: ${error.message}` } };
  }
  
  revalidatePath('/');
  redirect('/login?message=Your account has been successfully deleted.');
}
