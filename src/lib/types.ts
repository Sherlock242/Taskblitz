export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'Admin' | 'Member';
};

export type Template = {
  id: string;
  name: string;
  tasks: string[];
};

export type Task = {
  id: string;
  name: string;
  templateId: string;
  userId: string;
  status: 'To Do' | 'In Progress' | 'Done';
};
