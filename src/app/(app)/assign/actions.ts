'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function assignTasks(templateId: string, userId: string) {
    if (!templateId || !userId) {
        return { error: { message: 'Please select both a template and a user.' } };
    }

    const supabase = createClient();
    
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) {
        return { error: { message: 'You must be logged in to assign tasks.' } };
    }

    const [templateRes, userRes] = await Promise.all([
        supabase.from('templates').select('name, tasks').eq('id', templateId).single(),
        supabase.from('profiles').select('name').eq('id', userId).single()
    ]);

    if (templateRes.error || !templateRes.data || userRes.error || !userRes.data) {
        return { error: { message: 'Invalid template or user selected.' } };
    }
    
    const template = templateRes.data;
    const user = userRes.data;

    const newTasks = template.tasks.map((taskName, index) => ({
        name: taskName,
        template_id: templateId,
        user_id: userId,
        primary_assignee_id: userId,
        status: index === 0 ? 'Assigned' : 'To Do', // First task is active, rest are pending
        assigned_by: adminUser.id,
        position: index,
    }));

    // In a real scenario, you might want to use a status like 'Pending' or 'Blocked'
    // For now, we'll use 'To Do' as a stand-in for tasks that are not yet active
    // and convert them to 'Assigned' as the workflow progresses.
    const tasksToInsert = newTasks.map(task => ({
      ...task,
      status: task.position === 0 ? 'Assigned' : 'Assigned',
    }))


    const { error } = await supabase.from('tasks').insert(tasksToInsert);

    if (error) {
        return { error: { message: `Error assigning tasks: ${error.message}` } };
    }

    revalidatePath('/dashboard');

    return { data: { message: `Assigned ${template.tasks.length} tasks from "${template.name}" to ${user.name}.` } };
}
