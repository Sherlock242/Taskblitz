import type { User, Template, Task } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const findImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

export const users: User[] = [
  { id: 'user-1', name: 'Alice Johnson', email: 'alice@example.com', avatar_url: findImage('user-avatar-1'), role: 'Admin' },
  { id: 'user-2', name: 'Bob Williams', email: 'bob@example.com', avatar_url: findImage('user-avatar-2'), role: 'Member' },
  { id: 'user-3', name: 'Charlie Brown', email: 'charlie@example.com', avatar_url: findImage('user-avatar-3'), role: 'Member' },
];

export const templates: Template[] = [
  { id: 'template-1', name: 'Website Launch', tasks: ['Design Mockups', 'Code Frontend', 'Develop Backend', 'Run Tests', 'Deploy to Production'] },
  { id: 'template-2', name: 'Marketing Campaign', tasks: ['Plan Strategy', 'Create Ad Copy', 'Design Visuals', 'Launch Campaign', 'Analyze Results'] },
  { id: 'template-3', name: 'New Employee Onboarding', tasks: ['Prepare workspace', 'Setup accounts', 'Schedule orientation', 'Assign a mentor'] },
];

export const tasks: Task[] = [
  { id: 'task-1', name: 'Design Mockups', templateId: 'template-1', userId: 'user-1', status: 'Done' },
  { id: 'task-2', name: 'Code Frontend', templateId: 'template-1', userId: 'user-2', status: 'In Progress' },
  { id: 'task-3', name: 'Develop Backend', templateId: 'template-1', userId: 'user-2', status: 'To Do' },
  { id: 'task-4', name: 'Plan Strategy', templateId: 'template-2', userId: 'user-3', status: 'In Progress' },
  { id: 'task-5', name: 'Prepare workspace', templateId: 'template-3', userId: 'user-1', status: 'To Do' },
];
