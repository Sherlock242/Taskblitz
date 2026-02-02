'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { TemplateTask } from '@/lib/types';
import { randomUUID } from 'crypto';

export async function assignTasks(templateId: string, primaryAssigneeId: string, reviewerId: string) {
    if (!templateId) {
        return { error: { message: 'Please select a template.' } };
    }
    if (!primaryAssigneeId) {
        return { error: { message: 'Please select a primary assignee.' } };
    }
    if (!reviewerId) {
        return { error: { message: 'Please select a reviewer.' } };
    }

    const supabase = createClient();
    
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) {
        return { error: { message: 'You must be logged in to assign tasks.' } };
    }

    const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('name, tasks')
        .eq('id', templateId)
        .single();

    if (templateError || !template) {
        return { error: { message: 'Invalid template selected.' } };
    }
    
    const templateTasks = template.tasks as TemplateTask[];

    if (!templateTasks || templateTasks.length === 0) {
        return { error: { message: 'The selected template has no tasks.' } };
    }

    const workflowInstanceId = randomUUID();

    // All tasks in the workflow are initially assigned to the primary assignee.
    const newTasks = templateTasks.map((task, index) => ({
        name: task.name,
        template_id: templateId,
        user_id: primaryAssigneeId,
        primary_assignee_id: primaryAssigneeId,
        reviewer_id: reviewerId,
        status: 'Assigned',
        assigned_by: adminUser.id,
        position: index,
        workflow_instance_id: workflowInstanceId,
    }));

    const { error } = await supabase.from('tasks').insert(newTasks);

    if (error) {
        return { error: { message: `Error assigning tasks: ${error.message}` } };
    }

    revalidatePath('/dashboard');

    return { data: { message: `Assigned ${templateTasks.length} tasks from "${template.name}".` } };
}
