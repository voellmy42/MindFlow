
import Dexie, { Table } from 'dexie';
import { Task, Recipe, StagingItem, List } from './types';

class MindFlowDB extends Dexie {
  tasks!: Table<Task>;
  recipes!: Table<Recipe>;
  staging!: Table<StagingItem>;
  lists!: Table<List>;

  constructor() {
    super('MindFlowDB');
    (this as any).version(4).stores({
      tasks: '++id, status, createdAt, dueAt, ownerId, listId',
      recipes: '++id, name, ownerId',
      staging: '++id, createdAt',
      lists: '++id, name, createdAt'
    });
  }
}

export const db = new MindFlowDB();

// Seed initial data
(db as any).on('populate', () => {
  // Seed Recipes
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

  // Seed Lists
  db.lists.add({
    name: 'Personal',
    color: 'bg-sky-200',
    createdAt: Date.now()
  });
  
  db.lists.add({
    name: 'Work',
    color: 'bg-orange-200',
    createdAt: Date.now()
  });
  
  db.lists.add({
    name: 'Groceries',
    color: 'bg-emerald-200',
    createdAt: Date.now()
  });
});
