

import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch, arrayUnion, getDocs, limit } from 'firebase/firestore';
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

    // Two active listeners merged to avoid complex "OR" index requirements
    const ownedQ = query(collection(db, 'lists'), where('ownerId', '==', user.id));
    const sharedQ = query(collection(db, 'lists'), where('sharedWith', 'array-contains', user.id));

    let ownedLists: List[] = [];
    let sharedLists: List[] = [];

    const updateState = () => {
      const all = [...ownedLists, ...sharedLists];
      // Deduplicate just in case
      const unique = Array.from(new Map(all.map(item => [item.id, item])).values());
      unique.sort((a, b) => a.createdAt - b.createdAt);
      setLists(unique);
      setLoading(false);
    };

    const unsubOwned = onSnapshot(ownedQ, (snapshot) => {
      ownedLists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), role: 'owner' } as List));
      updateState();
    });

    const unsubShared = onSnapshot(sharedQ, (snapshot) => {
      sharedLists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), role: 'editor' } as List));
      updateState();
    });

    return () => {
      unsubOwned();
      unsubShared();
    };
  }, [user]);

  const addList = async (list: Partial<List>) => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'lists'), {
        ...list,
        ownerId: auth.currentUser.uid,
        createdAt: Date.now(),
        sharedId: crypto.randomUUID(),
        sharedWith: []
      });
    } catch (e) {
      console.error("addList: Failed", e);
      throw e;
    }
  };

  const deleteList = async (listId: string) => {
    const listRef = doc(db, 'lists', listId);
    await deleteDoc(listRef);
    // Note: Tasks are orphaned on client side delete for now, 
    // ideally use cloud function or batch delete tasks here.
  };

  const updateList = async (listId: string, updates: Partial<List>) => {
    await updateDoc(doc(db, 'lists', listId), updates);
  };

  const joinList = async (sharedId: string) => {
    if (!auth.currentUser) throw new Error("Not authenticated");

    // Find list by sharedId
    const q = query(collection(db, 'lists'), where('sharedId', '==', sharedId), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error("List not found or invalid link");
    }

    const listDoc = snapshot.docs[0];
    const listData = listDoc.data() as List;

    // Check if owner
    if (listData.ownerId === auth.currentUser.uid) {
      return { listId: listDoc.id, alreadyJoined: true };
    }

    // Check if already shared
    if (listData.sharedWith?.includes(auth.currentUser.uid)) {
      return { listId: listDoc.id, alreadyJoined: true };
    }

    // Add user to sharedWith
    await updateDoc(doc(db, 'lists', listDoc.id), {
      sharedWith: arrayUnion(auth.currentUser.uid)
    });

    return { listId: listDoc.id, alreadyJoined: false };
  };

  return { lists, loading, addList, deleteList, updateList, joinList };
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

    // Exclude deleted implementation...
    if (config?.excludeDeleted !== false) {
      // ...
    }

    // Security/Logic: MUTUALLY EXCLUSIVE SCOPES
    // 1. If we are in a LIST (listId provided), we query strictly by that listId.
    //    We do NOT filter by ownerId, so everyone sees everyone's tasks.
    // 2. If we are NOT in a list (e.g. Inbox, All Tasks), we default to ownerId == user.id
    //    to show only the user's private/owned tasks.
    if (!config?.listId) {
      constraints.push(where('ownerId', '==', user.id));
    }

    console.log("useTasks Query Constraints:", { listId: config?.listId, constraints: constraints.length });

    const q = query(tasksRef, ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      // Client-side filtering
      const filtered = taskData.filter(t => {
        if (config?.excludeDeleted && t.status === TaskStatus.DELETED) return false;
        return true;
      });

      // Client-side sorting
      filtered.sort((a, b) => b.createdAt - a.createdAt);

      setTasks(filtered);
      setLoading(false);
    }, (error) => {
      console.error("useTasks onSnapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, config?.status, config?.listId, config?.excludeDeleted]);

  // --- ACTIONS ---

  const addTask = async (task: Partial<Task>) => {
    if (!auth.currentUser) {
      console.error("addTask: No authenticated user");
      return;
    }
    console.log("addTask: Creating task", { task, ownerId: auth.currentUser.uid });
    try {
      // Sanitize task object to remove undefined values
      const taskData = {
        ...task,
        status: task.status || TaskStatus.INBOX,
        createdAt: Date.now(),
        ownerId: auth.currentUser.uid,
        publicId: crypto.randomUUID()
      };
      // Remove undefined keys
      Object.keys(taskData).forEach(key => (taskData as any)[key] === undefined && delete (taskData as any)[key]);

      await addDoc(collection(db, 'tasks'), taskData);
      console.log("addTask: Success");
    } catch (e) {
      console.error("addTask: Failed", e);
      throw e;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    console.log("updateTask: Updating", { taskId, updates });
    try {
      // Sanitize updates object to remove undefined values
      const cleanUpdates = { ...updates };
      Object.keys(cleanUpdates).forEach(key => (cleanUpdates as any)[key] === undefined && delete (cleanUpdates as any)[key]);

      await updateDoc(doc(db, 'tasks', taskId), cleanUpdates);
      console.log("updateTask: Success");
    } catch (e) {
      console.error("updateTask: Failed", e);
      throw e;
    }
  };

  const deleteTask = async (taskId: string) => {
    await updateDoc(doc(db, 'tasks', taskId), { status: TaskStatus.DELETED });
  };

  return { tasks, loading, addTask, updateTask, deleteTask };
};

// --- TRIAGE HOOK ---
export const useTriageTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { lists } = useLists(); // We need lists to find shared ones

  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    // 1. Owned Tasks (INBOX)
    const ownedRef = collection(db, 'tasks');
    const ownedQ = query(
      ownedRef,
      where('ownerId', '==', user.id),
      where('status', '==', TaskStatus.INBOX)
    );

    // 2. Shared Tasks (INBOX) - from lists where I am an editor
    // We already have 'lists' from useLists which includes shared lists
    const sharedListIds = lists
      .filter(l => l.role === 'editor')
      .map(l => l.id);

    console.log("useTriageTasks: Shared Lists", sharedListIds);

    // We can't easily wait for multiple onSnapshots in a clean linear way without managing state carefully.
    // So we'll set up listeners for both query sets if needed.

    // BUT: 'in' query supports max 10/30 items. If user has many shared lists, this breaks.
    // Optimistic approach: Most users have few shared lists.
    let unsubShared: () => void = () => { };
    let ownedTasks: Task[] = [];
    let sharedTasks: Task[] = [];

    const updateCombined = () => {
      const all = [...ownedTasks, ...sharedTasks];
      // Deduplicate
      const unique = Array.from(new Map(all.map(t => [t.id, t])).values());

      // FILTER: Exclude tasks with dueAt (Scheduled)
      const unscheduled = unique.filter(t => !t.dueAt);

      // Sort by creation
      unscheduled.sort((a, b) => b.createdAt - a.createdAt);

      setTasks(unscheduled);
      setLoading(false);
    };

    const unsubOwned = onSnapshot(ownedQ, (snapshot) => {
      ownedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      updateCombined();
    });

    if (sharedListIds.length > 0) {
      // Chunking if > 10? For now assume < 10 shared lists.
      // Actually firestore 'in' limit is 10.
      // If > 10, we might need multiple queries or just fetch all lists?
      // Let's safe guard: slice to 10.
      const safeSharedIds = sharedListIds.slice(0, 10);

      const sharedQ = query(
        collection(db, 'tasks'),
        where('listId', 'in', safeSharedIds),
        where('status', '==', TaskStatus.INBOX)
      );

      unsubShared = onSnapshot(sharedQ, (snapshot) => {
        sharedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        updateCombined();
      });
    }

    return () => {
      unsubOwned();
      unsubShared();
    };

  }, [user, lists]); // Re-run if lists change (new shared list added)

  const { updateTask } = useTasks(); // Reuse update logic

  return { tasks, loading, updateTask };
};

// --- TASKS HOOK (Extended) ---
// Note: Ideally move these logic implementations to a service if they grow too large
export const useTaskActions = () => {
  const { addTask, updateTask } = useTasks();

  const completeTask = async (task: Task) => {
    // 1. Mark original as DONE
    await updateTask(String(task.id), { status: TaskStatus.DONE });

    // 2. Check for recurrence
    if (task.recurrence) {
      console.log("Recurrence detected:", task.recurrence);
      const { interval, unit } = task.recurrence;

      // Calculate next date based on TODAY (User requested: "Creates new task once previous one is completed")
      // Implementation: Date.now() + interval
      const now = new Date();
      const nextDate = new Date();

      // Simple calculation
      if (unit === 'days') nextDate.setDate(now.getDate() + interval);
      if (unit === 'weeks') nextDate.setDate(now.getDate() + (interval * 7));
      if (unit === 'months') nextDate.setMonth(now.getMonth() + interval);
      if (unit === 'years') nextDate.setFullYear(now.getFullYear() + interval);

      // Set to same time if originally had a time, or keep defaults. 
      // Usually we want to preserve "Due Date" semantics (often just the day).
      // Let's reset to noon to be safe for "All Day" tasks if needed, or keep time if user uses time.
      // For now, simple date check.

      const newTask: Partial<Task> = {
        content: task.content,
        status: TaskStatus.INBOX, // Or TODO? Defaulting to INBOX for now so user sees it
        dueAt: nextDate.getTime(),
        responsible: task.responsible,
        notes: task.notes,
        listId: task.listId,
        recurrence: task.recurrence, // Keep recursing
        source: 'manual' // Technically automatic, but 'manual' keeps it editable easily
      };

      await addTask(newTask);
    }
  };

  return { completeTask };
};

// --- RECIPES HOOK ---
export const useRecipes = () => {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setRecipes([]);
      return;
    }

    const q = query(
      collection(db, 'recipes'),
      where('ownerId', '==', user.id)
      // Removed orderBy to prevent index errors
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recipeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Client-side sort
      recipeData.sort((a, b) => a.name.localeCompare(b.name));
      setRecipes(recipeData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const addRecipe = async (recipe: any) => {
    if (!auth.currentUser) return;
    await addDoc(collection(db, 'recipes'), {
      ...recipe,
      ownerId: auth.currentUser.uid,
      createdAt: Date.now(),
      sharedId: crypto.randomUUID()
    });
  };

  const deleteRecipe = async (recipeId: string) => {
    await deleteDoc(doc(db, 'recipes', recipeId));
  };

  return { recipes, loading, addRecipe, deleteRecipe };
};

// --- STAGING HOOK ---
export const useStaging = () => {
  const [stagingItems, setStagingItems] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setStagingItems([]);
      return;
    }

    const q = query(
      collection(db, 'staging'),
      where('ownerId', '==', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      data.sort((a, b) => b.createdAt - a.createdAt);
      setStagingItems(data);
    });
    return () => unsubscribe();
  }, [user]);

  const deleteStagingItem = async (id: string) => {
    await deleteDoc(doc(db, 'staging', id));
  };

  return { stagingItems, deleteStagingItem };
};