
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Task, Comment } from '@/lib/types';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function updateTaskStatus(taskId: string, newStatus: Task['status']) {
  const supabase = createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  
  if (!currentUser) {
    return { error: { message: 'You must be logged in to update tasks.' } };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  const isAdmin = profile?.role === 'Admin';

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    return { error: { message: `Task not found: ${taskError?.message}` } };
  }

  let updatePayload: Partial<Task> = {
    updated_at: new Date().toISOString(),
  };

  const isPrimaryAssignee = currentUser.id === task.primary_assignee_id;
  const isReviewer = currentUser.id === task.reviewer_id;
  let isValidTransition = false;

  // --- State Machine Logic ---
  if (isAdmin) {
    isValidTransition = true;
    updatePayload.status = newStatus;
  }
  else if (newStatus === 'In Progress' && (task.status === 'Assigned' || task.status === 'Changes Requested') && isPrimaryAssignee) {
    isValidTransition = true;
    updatePayload.status = 'In Progress';
  }
  else if (newStatus === 'Submitted for Review' && task.status === 'In Progress' && isPrimaryAssignee) {
    if (!task.reviewer_id) {
      return { error: { message: 'No reviewer has been designated for this workflow.' } };
    }
    isValidTransition = true;
    updatePayload.status = 'Submitted for Review';
  }
  else if (newStatus === 'Changes Requested' && task.status === 'Submitted for Review' && isReviewer) {
    isValidTransition = true;
    updatePayload.status = 'Changes Requested';
  }
  else if (newStatus === 'Approved' && task.status === 'Submitted for Review' && isReviewer) {
    isValidTransition = true;
    updatePayload.status = 'Approved';
  }
  
  if (!isValidTransition) {
    return { error: { message: `Invalid status transition from "${task.status}" to "${newStatus}".` } };
  }

  // Handle side-effect for 'Approved' status
  if (updatePayload.status === 'Approved') {
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
    
    const { data: nextTask } = await supabaseAdmin
        .from('tasks')
        .select('id')
        .eq('workflow_instance_id', task.workflow_instance_id)
        .eq('position', (task.position ?? -1) + 1)
        .maybeSingle();

    if (nextTask) {
        // Status is already 'Approved'
        const { error: updateNextError } = await supabaseAdmin
            .from('tasks')
            .update({ status: 'Assigned' })
            .eq('id', nextTask.id)
            .eq('status', 'Pending');
        if (updateNextError) {
            return { error: { message: `Failed to activate next task: ${updateNextError.message}` } };
        }
    } else {
        // This is the last task, so the workflow is completed
        updatePayload.status = 'Completed';
    }
  }
  
  const { error } = await supabase
    .from('tasks')
    .update(updatePayload)
    .eq('id', taskId);

  if (error) {
    console.error('Error updating task status', error);
    return { error: { message: `Failed to update task status: ${error.message}` } };
  }

  revalidatePath('/dashboard');
  return { error: null };
}

export async function deleteTask(taskId: string) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
      return { error: { message: 'You must be logged in to delete tasks.' } };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  if (profile?.role !== 'Admin') {
      return { error: { message: 'Only admins can delete tasks.' } };
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task', error);
    return { error: { message: `Failed to delete task: ${error.message}` } };
  }

  revalidatePath('/dashboard');
  return { data: { message: 'Task deleted successfully.' } };
}


export async function updateTask(taskId: string, updates: Partial<Pick<Task, 'name' | 'description' | 'deadline'>>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
      return { error: { message: 'You must be logged in.' } };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  if (profile?.role !== 'Admin') {
      return { error: { message: 'Only admins can edit tasks.' } };
  }

  const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);

  if (error) {
    return { error: { message: `Failed to update task: ${error.message}` } };
  }

  revalidatePath('/dashboard');
  return { data: { message: 'Task updated successfully.' } };
}

export async function getComments(taskId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
      return { error: { message: 'You must be logged in to view comments.' } };
  }
  
  const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabaseAdmin
    .from('comments')
    .select('*, profiles(name, avatar_url)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error("Error fetching comments with admin client:", error);
    return { error: { message: `Failed to fetch comments: ${error.message}` } };
  }
  return { data: data as Comment[] };
}

export async function addComment(taskId: string, content: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: { message: 'You must be logged in to comment.' } };
  }

  if (!content.trim()) {
    return { error: { message: 'Comment cannot be empty.' } };
  }
  
  const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await supabaseAdmin.from('comments').insert({
    task_id: taskId,
    user_id: user.id,
    content,
  });

  if (error) {
    return { error: { message: `Failed to add comment: ${error.message}` } };
  }

  revalidatePath('/dashboard');
  return { data: { message: 'Comment added.' } };
}
