'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect(`/login?message=${error.message}`)
  }

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
        return redirect(`/signup?message=${error.message}`)
    }
    
    if (data.user && !data.session) {
      return redirect('/login?message=Check your email to continue the sign-up process.');
    }
    
    return redirect('/dashboard');
}

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  return redirect('/login')
}

export async function requestPasswordReset(formData: FormData) {
  const origin = headers().get('origin')
  const email = formData.get('email') as string
  const supabase = createClient()

  const redirectTo = `${origin}/reset-password`

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) {
    return redirect(`/forgot-password?error=${error.message}`)
  }

  return redirect('/forgot-password?message=Password reset link has been sent to your email.')
}

export async function resetPassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm-password') as string
  const supabase = createClient()
  
  if (password !== confirmPassword) {
      return redirect('/reset-password?error=Passwords do not match')
  }
  
  if (password.length < 6) {
      return redirect('/reset-password?error=Password must be at least 6 characters long')
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return redirect(`/reset-password?error=${error.message}`)
  }
    
  await supabase.auth.signOut()
  return redirect('/login?message=Your password has been reset successfully. Please log in.')
}
