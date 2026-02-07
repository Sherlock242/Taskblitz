'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache';

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: { message: error.message } };
  }

  revalidatePath('/', 'layout');
  return redirect('/dashboard')
}

export async function signup(formData: FormData) {
    const origin = headers().get('origin')
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('full-name') as string;
    const role = formData.get('role') as string;

    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${origin}/auth/callback`,
            data: {
                full_name: fullName,
                role: role,
                avatar_url: `https://picsum.photos/seed/${Math.random() * 1000}/80/80`
            }
        },
    });

    if (error) {
        return { error: { message: error.message } };
    }
    
    if (data.user && !data.session) {
      return { data: { message: 'Check your email to continue the sign-up process.' } };
    }
    
    revalidatePath('/', 'layout');
    return redirect('/dashboard');
}

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  return redirect('/login')
}

export async function requestPasswordReset(formData: FormData) {
  const headersList = headers();
  const host = headersList.get('host');
  // Ensure we have a protocol. In production, 'x-forwarded-proto' is common.
  const protocol = headersList.get('x-forwarded-proto') || (process.env.NODE_ENV === 'development' ? 'http' : 'https');
  const origin = `${protocol}://${host}`;
  
  const email = formData.get('email') as string
  const supabase = createClient()

  const redirectTo = `${origin}/reset-password`

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) {
    return { error: { message: error.message } }
  }

  return { data: { message: 'Password reset link has been sent to your email.' } }
}

export async function resetPassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm-password') as string
  
  if (password !== confirmPassword) {
      return { error: { message: 'Passwords do not match.' } };
  }
  
  if (password.length < 6) {
      return { error: { message: 'Password must be at least 6 characters long.' } };
  }

  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: { message: error.message } };
  }
    
  await supabase.auth.signOut()
  return { data: { message: 'Your password has been reset successfully. Please log in.' } };
}
