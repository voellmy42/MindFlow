export enum TaskStatus {
  INBOX = 'INBOX',
  TODAY = 'TODAY',
  SNOOZED = 'SNOOZED',
  DONE = 'DONE',
  DELETED = 'DELETED',
}

export interface Task {
  id?: number;
  content: string;
  status: TaskStatus;
  createdAt: number;
  dueAt?: number;
  source?: 'manual' | 'share' | 'recipe';
  responsible?: string;
  notes?: string;
}

export interface Recipe {
  id?: number;
  name: string;
  template: string; // e.g., "Pack for {days} days to {location}"
  taskTemplates: string[]; // e.g., ["Buy ticket to {location}", "Pack {days} pairs of socks"]
  color: string;
}

export type SwipeDirection = 'left' | 'right' | 'down' | 'up';
