
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
  const isReviewer = !isPrimaryAssignee && currentUser.id === task.user_id;

  // --- State Machine Logic ---

  if (newStatus === 'In Progress' && (task.status === 'Assigned' || task.status === 'Changes Requested') && isPrimaryAssignee) {
    updatePayload.status = 'In Progress';
  }
  else if (newStatus === 'Submitted for Review' && task.status === 'In Progress' && isPrimaryAssignee) {
    if (!task.reviewer_id) {
      return { error: { message: 'No reviewer has been designated for this workflow.' } };
    }
    updatePayload.status = 'Submitted for Review';
    updatePayload.user_id = task.reviewer_id; // Assign to the designated reviewer
  }
  else if (newStatus === 'Changes Requested' && task.status === 'Submitted for Review' && isReviewer) {
    updatePayload.status = 'Assigned'; // Reset to "To Do" state for the original user
    updatePayload.user_id = task.primary_assignee_id; // Reassign back to original assignee
  }
  else if (newStatus === 'Approved' && task.status === 'Submitted for Review' && isReviewer) {
    // --- Sequential Task Logic ---
    const { data: allTasksInWorkflow } = await supabase
      .from('tasks')
      .select('id, position')
      .eq('workflow_instance_id', task.workflow_instance_id)
      .order('position', { ascending: true });

    if (!allTasksInWorkflow) {
      return { error: { message: 'Could not find other tasks in this template.' }};
    }

    const currentTaskIndex = allTasksInWorkflow.findIndex(t => t.id === task.id);
    const nextTask = allTasksInWorkflow[currentTaskIndex + 1];

    if (nextTask) {
      // It's not the last task, so mark it as Approved and hand it back to the primary user.
      // The UI will handle enabling the next task in the sequence for its assigned user.
      updatePayload.status = 'Approved';
      updatePayload.user_id = task.primary_assignee_id;
    } else {
      // This is the last task, so mark it as Completed
      updatePayload.status = 'Completed';
      updatePayload.user_id = task.primary_assignee_id;
    }
  }
  else {
    return { error: { message: `Invalid status transition from "${task.status}" to "${newStatus}".` } };
  }
  
  // --- Use Admin client to bypass RLS for the update ---
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const { error } = await supabaseAdmin
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
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(name, avatar_url)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error("Error fetching comments", error);
    return { error };
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

  const { error } = await supabase.from('comments').insert({
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
