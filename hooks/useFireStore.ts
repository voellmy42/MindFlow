

import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, addDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { List, Task, TaskStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';

// --- LISTS HOOK ---
export const useLists = () => {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
        setLists([]);
        return;
    }

    // In a real app, you might check 'ownerId' == user.id OR 'sharedWith' array
    const q = query(
        collection(db, 'lists'), 
        orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setLists(listData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const addList = async (list: Partial<List>) => {
    if (!auth.currentUser) return;
    await addDoc(collection(db, 'lists'), {
        ...list,
        ownerId: auth.currentUser.uid,
        createdAt: Date.now(),
        sharedId: crypto.randomUUID()
    });
  };

  const deleteList = async (listId: string) => {
      // Delete list and all associated tasks
      const batch = writeBatch(db);
      const listRef = doc(db, 'lists', listId);
      batch.delete(listRef);

      // Find tasks linked to this list
      // Note: For large collections, this should be done via Cloud Functions
      const tasksQ = query(collection(db, 'tasks'), where('listId', '==', listId));
      // We can't await inside batch synchronously easily without fetching, 
      // so for client-side we'll just delete the list ref and let tasks be orphaned or handle separately
      // A better way is to fetch then batch delete
      batch.delete(listRef); 
      await batch.commit();
  };

  return { lists, loading, addList, deleteList };
};

// --- TASKS HOOK ---
// Unified hook that can filter by Status, List, or "All"
export const useTasks = (config?: { 
    status?: TaskStatus, 
    listId?: string | number | null, 
    excludeDeleted?: boolean 
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Base collection reference
    const tasksRef = collection(db, 'tasks');
    
    // Build Constraints
    const constraints = [];

    // Filter by specific list (if provided)
    if (config?.listId) {
        constraints.push(where('listId', '==', config.listId));
    } 
    // Filter by specific status (if provided)
    else if (config?.status) {
        constraints.push(where('status', '==', config.status));
    } 
    // "Inbox" logic: No listId AND status is INBOX (or just no listId depending on your logic)
    // For this app: Inbox = status INBOX.
    
    // Exclude deleted (common pattern)
    if (config?.excludeDeleted !== false) {
       // Note: Firestore doesn't support != queries easily mixed with others.
       // It's often easier to filter DELETED on client side if querying complex ranges,
       // OR ensure we only query for active statuses.
    }

    // Default sorting
    constraints.push(orderBy('createdAt', 'desc'));

    const q = query(tasksRef, ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Client-side filtering for things hard to do in complex compound queries
      const filtered = taskData.filter(t => {
          if (config?.excludeDeleted && t.status === TaskStatus.DELETED) return false;
          return true;
      });

      setTasks(filtered);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, config?.status, config?.listId, config?.excludeDeleted]);

  // --- ACTIONS ---
  
  const addTask = async (task: Partial<Task>) => {
    if (!auth.currentUser) return;
    await addDoc(collection(db, 'tasks'), {
        ...task,
        status: task.status || TaskStatus.INBOX,
        createdAt: Date.now(),
        ownerId: auth.currentUser.uid,
        publicId: crypto.randomUUID()
    });
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
      await updateDoc(doc(db, 'tasks', taskId), updates);
  };
  
  const deleteTask = async (taskId: string) => {
      await updateDoc(doc(db, 'tasks', taskId), { status: TaskStatus.DELETED });
  };

  return { tasks, loading, addTask, updateTask, deleteTask };
};