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
  description: string | null;
  deadline: string | null;
  template_id: string | null;
  user_id: string;
  assigned_by: string | null;
  primary_assignee_id: string | null;
  status: 'To Do' | 'In Progress' | 'Done' | 'Needs Review';
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
