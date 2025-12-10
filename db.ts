import Dexie, { Table } from 'dexie';
import { Task, Recipe, TaskStatus } from './types';

class MindFlowDB extends Dexie {
  tasks!: Table<Task>;
  recipes!: Table<Recipe>;

  constructor() {
    super('MindFlowDB');
    (this as any).version(1).stores({
      tasks: '++id, status, createdAt, dueAt',
      recipes: '++id, name'
    });
  }
}

export const db = new MindFlowDB();

// Seed initial recipes if empty
(db as any).on('populate', () => {
  db.recipes.add({
    name: 'Travel Prep',
    template: 'Trip to {destination} for {days} days',
    taskTemplates: [
      'Check visa requirements for {destination}',
      'Book flights to {destination}',
      'Pack {days} outfits',
      'Charge powerbank'
    ],
    color: 'bg-rose-200'
  });
  
  db.recipes.add({
    name: 'Weekly Review',
    template: 'Review week {weekNum}',
    taskTemplates: [
      'Clear desktop for week {weekNum}',
      'Review calendar for week {weekNum}',
      'Process email inbox'
    ],
    color: 'bg-indigo-200'
  });
});