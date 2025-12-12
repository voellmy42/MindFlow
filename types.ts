

export enum TaskStatus {
  INBOX = 'INBOX',
  TODAY = 'TODAY',
  SNOOZED = 'SNOOZED',
  DONE = 'DONE',
  DELETED = 'DELETED',
}

export interface List {
  id?: string | number;
  sharedId?: string; // Unique UUID for syncing across devices
  name: string;
  color: string;
  icon?: string; // e.g. emoji
  createdAt: number;
  role?: 'owner' | 'editor'; // 'owner' can delete list, 'editor' can only edit content
  sharedWith?: string[]; // Array of user IDs or emails who have access
  ownerId?: string;
  lastSyncedAt?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Task {
  id?: string | number;
  publicId?: string; // Unique UUID for syncing items across devices
  content: string;
  status: TaskStatus;
  createdAt: number;
  dueAt?: number | null;
  source?: 'manual' | 'share' | 'recipe' | 'voice';
  responsible?: string;
  assigneeEmail?: string;
  assigneeAvatar?: string;
  notes?: string;
  ownerId?: string; // For syncing/sharing
  listId?: string | number; // Link to a List
  recurrence?: RecurrenceRule;
}

export type RecurrenceInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceRule {
  interval: number;
  unit: 'days' | 'weeks' | 'months' | 'years';
}

export interface Recipe {
  id?: string | number;
  name: string;
  template: string; // e.g., "Pack for {days} days to {location}"
  taskTemplates: string[]; // e.g., ["Buy ticket to {location}", "Pack {days} pairs of socks"]
  color: string;
  sharedId?: string; // Unique UUID for sharing
  ownerId?: string; // For syncing/sharing
}

export interface StagingItem {
  id?: string | number;
  createdAt: number;
  summary: string;
  status: 'processing' | 'ready' | 'error';
  error?: string;
  tasks: Array<{
    id: string; // temp id
    content: string;
    dueAt?: number;
    responsible?: string;
    notes?: string;
  }>;
}

export type SwipeDirection = 'left' | 'right' | 'down' | 'up';