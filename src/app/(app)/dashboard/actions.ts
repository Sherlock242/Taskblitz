'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Task, Comment, AuditTrailItem, TaskHistory } from '@/lib/types';
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

  const previousStatus = task.status;

  // Check if this is the last task in the workflow
  const supabaseAdminForCheck = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: workflowTasks, error: workflowError } = await supabaseAdminForCheck
    .from('tasks')
    .select('position')
    .eq('workflow_instance_id', task.workflow_instance_id);
    
  if (workflowError) {
      return { error: { message: `Could not verify workflow: ${workflowError.message}` } };
  }
  
  const maxPosition = Math.max(...(workflowTasks?.map(t => t.position ?? -1) || [-1]));
  const isLastTask = task.position === maxPosition;


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
  else if (newStatus === 'Submitted for Review' && task.status === 'In Progress' && isPrimaryAssignee && !isLastTask) {
    if (!task.reviewer_id) {
      return { error: { message: 'No reviewer has been designated for this workflow.' } };
    }
    isValidTransition = true;
    updatePayload.status = 'Submitted for Review';
  }
  else if (newStatus === 'Completed' && task.status === 'In Progress' && isPrimaryAssignee && isLastTask) {
    isValidTransition = true;
    updatePayload.status = 'Completed';
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

  if (updatePayload.status && updatePayload.status !== previousStatus) {
    const supabaseAdminForHistory = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { error: historyError } = await supabaseAdminForHistory.from('task_history').insert({
        task_id: taskId,
        user_id: currentUser.id,
        previous_status: previousStatus,
        new_status: updatePayload.status,
    });

    if (historyError) {
        // Log this error, but don't fail the whole operation since the primary action (status update) succeeded.
        console.error("Failed to log task history:", historyError);
    }
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'Admin';
  
  let error;

  if (isAdmin) {
    // If the user is an admin, use the service_role key to bypass RLS.
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
    
    const { error: adminError } = await supabaseAdmin
      .from('tasks')
      .update(updates)
      .eq('id', taskId);
    error = adminError;

  } else {
    // For non-admins, use the standard client which respects the user's RLS policies.
    const { error: userError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId);
    error = userError;
  }

  if (error) {
    return { error: { message: `Failed to update task: ${error.message}` } };
  }

  revalidatePath('/dashboard');
  return { data: { message: 'Task updated successfully.' } };
}

export async function getAuditTrail(taskId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
      return { error: { message: 'You must be logged in to view activity.' } };
  }
  
  const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Fetch comments and history
  const { data: comments, error: commentsError } = await supabaseAdmin
    .from('comments')
    .select('*')
    .eq('task_id', taskId);
    
  if (commentsError) {
    console.error("Error fetching comments:", commentsError);
    return { error: { message: `Failed to fetch comments: ${commentsError.message}` } };
  }

  const { data: history, error: historyError } = await supabaseAdmin
    .from('task_history')
    .select('*')
    .eq('task_id', taskId);

  if (historyError) {
    console.error("Error fetching history:", historyError);
    return { error: { message: `Failed to fetch history: ${historyError.message}` } };
  }

  const allItems = [...(comments || []), ...(history || [])];
  if (allItems.length === 0) {
    return { data: [] };
  }

  // 2. Get unique user IDs from both
  const userIds = [...new Set(allItems.map(i => i.user_id))];

  // 3. Fetch profiles for those user IDs
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', userIds);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return { error: { message: `Failed to fetch profiles: ${profilesError.message}` } };
  }
  
  const profileMap = new Map(profiles.map(p => [p.id, {name: p.name, avatar_url: p.avatar_url}]));

  // 4. Manually join and format the data
  const formattedComments = (comments || []).map(comment => ({
    ...comment,
    profiles: profileMap.get(comment.user_id) || null,
    type: 'comment' as const,
    date: comment.created_at
  }));

  const formattedHistory = (history || []).map(item => ({
    ...item,
    profiles: profileMap.get(item.user_id) || null,
    type: 'status_change' as const,
    date: item.changed_at
  }));

  const auditTrail: AuditTrailItem[] = [...formattedComments, ...formattedHistory];

  // 5. Sort chronologically
  auditTrail.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return { data: auditTrail };
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

  return { data: { message: 'Comment added.' } };
}

export async function deleteComment(commentId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: { message: 'You must be logged in to delete comments.' } };
  }
  
  const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: comment, error: fetchError } = await supabaseAdmin
    .from('comments')
    .select('user_id')
    .eq('id', commentId)
    .single();

  if (fetchError || !comment) {
      return { error: { message: 'Comment not found.' } };
  }

  // Check if user is admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  
  // Allow deletion if user is the comment owner or an admin
  if (comment.user_id !== user.id && profile?.role !== 'Admin') {
      return { error: { message: "You don't have permission to delete this comment." } };
  }

  const { error } = await supabaseAdmin
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    return { error: { message: `Failed to delete comment: ${error.message}` } };
  }

  return { data: { message: 'Comment deleted.' } };
}
