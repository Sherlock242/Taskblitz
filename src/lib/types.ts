export type User = {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  role: 'Admin' | 'Member';
};

export type TemplateTask = {
  name: string;
  role: string;
  user_id: string;
  deadline_days?: number | null;
};

export type Template = {
  id: string;
  name: string;
  description: string;
  tasks: TemplateTask[];
};

export type Task = {
  id:string;
  workflow_instance_id: string;
  name: string;
  description: string | null;
  deadline: string | null;
  template_id: string | null;
  user_id: string;
  assigned_by: string | null;
  primary_assignee_id: string | null;
  reviewer_id: string | null;
  status: 'Pending' | 'Assigned' | 'In Progress' | 'Submitted for Review' | 'Changes Requested' | 'Approved' | 'Completed';
  created_at: string;
  updated_at: string | null;
  position: number | null;
};

export type Comment = {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: Pick<User, 'name' | 'avatar_url'> | null;
};

export type TaskHistory = {
  id: string;
  task_id: string;
  user_id: string;
  previous_status: string | null;
  new_status: string;
  changed_at: string;
  profiles: Pick<User, 'name' | 'avatar_url'> | null;
};

export type AuditTrailItem =
  | (Comment & { type: 'comment', date: string })
  | (TaskHistory & { type: 'status_change', date: string });