'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Task } from '@/lib/types';

export async function updateTaskStatus(taskId: string, newStatus: Task['status']) {
  const supabase = createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  
  if (!currentUser) {
    return { error: { message: 'You must be logged in to update tasks.' } };
  }

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('user_id, assigned_by, primary_assignee_id, status')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    return { error: { message: `Task not found: ${taskError?.message}` } };
  }

  let updatePayload: Partial<Task> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  // Case 1: Primary assignee completes the task -> send to reviewer for approval
  if (
    newStatus === 'Done' &&
    currentUser.id === task.primary_assignee_id &&
    task.assigned_by // Ensure there is a reviewer
  ) {
    updatePayload.status = 'Needs Review';
    updatePayload.user_id = task.assigned_by; // Reassign to the reviewer
  }
  // Case 2: Reviewer requests changes -> send back to original assignee
  else if (
    (newStatus === 'To Do' || newStatus === 'In Progress') &&
    currentUser.id === task.assigned_by &&
    task.status === 'Needs Review' &&
    task.primary_assignee_id
  ) {
    updatePayload.user_id = task.primary_assignee_id; // Reassign back
  }
  // Case 3: Reviewer gives final approval
  else if (
    newStatus === 'Done' &&
    currentUser.id === task.assigned_by &&
    task.status === 'Needs Review'
  ) {
    // The status is already 'Done' in the payload, so we just let it proceed.
    // The task remains assigned to the reviewer, marking them as the final approver.
  }
  // Default case: any other status change not covered by the handoff logic
  else {
    // Just update status and timestamp
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
