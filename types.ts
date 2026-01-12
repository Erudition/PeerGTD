export enum TaskStatus {
  INBOX = 'inbox',
  NEXT = 'next',
  WAITING = 'waiting',
  SOMEDAY = 'someday',
  DONE = 'done',
  TRASH = 'trash'
}

export interface ITask {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: number; // Stored as u64 (bigint) in Borsh, converted to number for UI
  tags: string[];
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}
