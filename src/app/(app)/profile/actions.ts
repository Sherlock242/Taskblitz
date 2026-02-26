'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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

  // Use a clean path. Using a generic filename with a timestamp in the storage metadata 
  // is often more reliable than changing extensions.
  const filePath = `${user.id}/avatar.jpg`;

  // Upload the file. Upsert ensures we overwrite the old one.
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, avatarFile, {
      cacheControl: '0',
      upsert: true
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return { error: { message: `Failed to upload avatar: ${uploadError.message}.` } };
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);

  if (!urlData.publicUrl) {
    return { error: { message: 'Could not get public URL for avatar.' } };
  }
  
  // Use a unique query param to force the browser to ignore its cache for this URL
  const uniqueUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  // Use admin client to ensure we have permission to update the profile record
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: updatedProfile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ avatar_url: uniqueUrl })
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) {
    return { error: { message: `Failed to update profile record: ${updateError.message}` } };
  }

  // Aggressive revalidation
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