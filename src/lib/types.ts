export type User = {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  role: 'Admin' | 'Member';
};

export type Template = {
  id: string;
  name: string;
  description: string;
  tasks: string[];
};

export type Task = {
  id: string;
  name: string;
  template_id: string | null;
  user_id: string;
  assigned_by: string | null;
  primary_assignee_id: string | null;
  status: 'To Do' | 'In Progress' | 'Done' | 'Needs Review';
  created_at: string;
  updated_at: string | null;
  position: number | null;
};
