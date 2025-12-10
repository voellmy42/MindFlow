
import Dexie, { Table } from 'dexie';
import { Task, Recipe, StagingItem, List } from './types';

class MindFlowDB extends Dexie {
  tasks!: Table<Task>;
  recipes!: Table<Recipe>;
  staging!: Table<StagingItem>;
  lists!: Table<List>;

  constructor() {
    super('MindFlowDB');
    (this as any).version(6).stores({
      tasks: '++id, publicId, status, createdAt, dueAt, ownerId, listId',
      recipes: '++id, name, ownerId',
      staging: '++id, createdAt',
      lists: '++id, sharedId, name, createdAt'
    }).upgrade(async (trans: any) => {
        // Migration: Ensure all existing items have UUIDs
        await trans.table('tasks').toCollection().modify((t: Task) => {
            if (!t.publicId) t.publicId = crypto.randomUUID();
        });
        await trans.table('lists').toCollection().modify((l: List) => {
            if (!l.sharedId) l.sharedId = crypto.randomUUID();
        });
    });

    // Hooks to automatically assign UUIDs on creation
    this.tasks.hook('creating', (primKey, obj) => {
        if (!obj.publicId) obj.publicId = crypto.randomUUID();
    });
    this.lists.hook('creating', (primKey, obj) => {
        if (!obj.sharedId) obj.sharedId = crypto.randomUUID();
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
