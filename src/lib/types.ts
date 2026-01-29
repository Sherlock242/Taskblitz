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
  template_id: string;
  user_id: string;
  status: 'To Do' | 'In Progress' | 'Done';
  created_at: string;
};
