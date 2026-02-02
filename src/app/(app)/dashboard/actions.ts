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

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('user_id, primary_assignee_id, status')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    return { error: { message: `Task not found: ${taskError?.message}` } };
  }

  // Ensure the user changing the status is the one the task is assigned to OR is an admin
  if (profile?.role !== 'Admin' && currentUser.id !== task.user_id) {
      return { error: { message: 'You can only update tasks assigned to you.'}};
  }

  let updatePayload: Partial<Task> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  // --- Peer Review Handoff Logic ---

  // Case 1: Primary assignee completes the task -> send to a peer for review
  if (
    newStatus === 'Done' &&
    task.status !== 'Needs Review' && // Prevent loops
    currentUser.id === task.primary_assignee_id
  ) {
    // Find another 'Member' to review the task.
    const { data: peerReviewer, error: peerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'Member')
      .neq('id', currentUser.id) // Exclude the current user
      .limit(1)
      .single();
    
    if (peerReviewer && !peerError) {
      // A peer was found, so send it for review.
      updatePayload.status = 'Needs Review';
      updatePayload.user_id = peerReviewer.id;
    }
    // If no peer is found, the status will just be updated to 'Done'.
  }
  // Case 2: Reviewer requests changes -> send back to original assignee
  else if (
    (newStatus === 'To Do' || newStatus === 'In Progress') &&
    task.status === 'Needs Review' &&
    task.primary_assignee_id
  ) {
    updatePayload.user_id = task.primary_assignee_id; // Reassign back
  }
  // Case 3: Reviewer gives final approval -> task is marked 'Done'
  else if (
    newStatus === 'Done' &&
    task.status === 'Needs Review'
  ) {
    // The payload already has status: 'Done'. The task remains assigned to the reviewer,
    // marking them as the final approver.
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
