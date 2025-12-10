
export enum TaskStatus {
  INBOX = 'INBOX',
  TODAY = 'TODAY',
  SNOOZED = 'SNOOZED',
  DONE = 'DONE',
  DELETED = 'DELETED',
}

export interface List {
  id?: number;
  name: string;
  color: string;
  icon?: string; // e.g. emoji
  createdAt: number;
  role?: 'owner' | 'editor'; // 'owner' can delete list, 'editor' can only edit content
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
  ownerId?: string; // For syncing/sharing
  listId?: number; // Link to a List
}

export interface Recipe {
  id?: number;
  name: string;
  template: string; // e.g., "Pack for {days} days to {location}"
  taskTemplates: string[]; // e.g., ["Buy ticket to {location}", "Pack {days} pairs of socks"]
  color: string;
  ownerId?: string; // For syncing/sharing
}

export interface StagingItem {
  id?: number;
  createdAt: number;
  summary: string;
  tasks: Array<{
    id: string; // temp id
    content: string;
    dueAt?: number;
    responsible?: string;
    notes?: string;
  }>;
}

export type SwipeDirection = 'left' | 'right' | 'down' | 'up';
