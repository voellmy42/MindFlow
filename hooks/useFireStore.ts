

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
    // "Inbox" logic: No listId AND status is INBOX (or just no listId depending on your logic)
    // For this app: Inbox = status INBOX.

    // Exclude deleted (common pattern)
    if (config?.excludeDeleted !== false) {
      // Note: Firestore doesn't support != queries easily mixed with others.
      // It's often easier to filter DELETED on client side if querying complex ranges,
      // OR ensure we only query for active statuses.
    }

    // Default filters
    constraints.push(where('ownerId', '==', user.id));
    // REMOVED orderBy to prevent "missing index" errors during dev
    // constraints.push(orderBy('createdAt', 'desc'));

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