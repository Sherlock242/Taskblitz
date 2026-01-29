'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addTemplate(name: string, tasks: string[]) {
  const supabase = createClient();
  
  if (!name || tasks.length === 0) {
    return { error: { message: 'A template must have a name and at least one task.' } };
  }

  const newTemplate = { name, tasks };

  const { data, error } = await supabase
    .from('templates')
    .insert([newTemplate])
    .select()
    .single();

  if (error) {
    console.error('Error creating template', error);
    return { error: { message: `Failed to create template: ${error.message}` } };
  }

  revalidatePath('/templates');
  return { data };
}
