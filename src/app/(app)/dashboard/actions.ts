'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Task, Comment } from '@/lib/types';

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
    const { data: peerReviewer, error: peerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'Member')
      .neq('id', currentUser.id)
      .limit(1)
      .single();
    
    if (peerError || !peerReviewer) {
      return { error: { message: 'Could not find a peer to review this task. Approving automatically.' } };
    }

    updatePayload.status = 'Submitted for Review';
    updatePayload.user_id = peerReviewer.id;
  }
  else if (newStatus === 'Changes Requested' && task.status === 'Submitted for Review' && isReviewer) {
    updatePayload.status = 'Changes Requested';
    updatePayload.user_id = task.primary_assignee_id; // Reassign back to original assignee
  }
  else if (newStatus === 'Approved' && task.status === 'Submitted for Review' && isReviewer) {
    // --- Sequential Task Logic ---
    const { data: allTasksInTemplate } = await supabase
      .from('tasks')
      .select('id, position')
      .eq('template_id', task.template_id)
      .eq('primary_assignee_id', task.primary_assignee_id)
      .order('position', { ascending: true });

    if (!allTasksInTemplate) {
      return { error: { message: 'Could not find other tasks in this template.' }};
    }

    const currentTaskIndex = allTasksInTemplate.findIndex(t => t.id === task.id);
    const nextTask = allTasksInTemplate[currentTaskIndex + 1];

    if (nextTask) {
      // It's not the last task, so mark as Approved and return ownership.
      // The UI will handle enabling the next task for the primary assignee.
      updatePayload.status = 'Approved';
      updatePayload.user_id = task.primary_assignee_id; // Return ownership to primary assignee

    } else {
      // This is the last task, so mark it as Completed
      updatePayload.status = 'Completed';
      updatePayload.user_id = task.primary_assignee_id;
    }
  }
  else {
    return { error: { message: `Invalid status transition from "${task.status}" to "${newStatus}".` } };
  }
  
  const { error } = await supabase
    .from('tasks')
    .update(updatePayload)
    .eq('id', taskId);

  if (error) {
    console.error('Error updating task status', error);
    return { error: { message: 'Failed to update task status.' } };
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
