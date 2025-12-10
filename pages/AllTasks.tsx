
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Task, TaskStatus } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, CalendarDays, User, AlignLeft } from 'lucide-react';
import { hapticImpact } from '../services/haptics';
import { TaskDetailModal } from '../components/TaskDetailModal';

// --- Task Item ---
const TaskItem: React.FC<{ task: Task; onSelect: (t: Task) => void }> = ({ task, onSelect }) => {
  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticImpact.light();
    db.tasks.update(task.id, { status: TaskStatus.DONE });
  };
  
  // Fetch list name if exists
  const list = useLiveQuery(() => task.listId ? db.lists.get(task.listId) : Promise.resolve(undefined), [task.listId]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-start gap-3 py-3 border-b border-cozy-100 last:border-0 group active:bg-cozy-50 -mx-4 px-4 transition-colors rounded-xl"
    >
      <button onClick={handleComplete} className="text-cozy-300 hover:text-green-500 transition-colors mt-1 p-1 -ml-1">
        <Circle size={24} strokeWidth={1.5} />
      </button>
      <div className="flex-1 cursor-pointer py-1" onClick={() => onSelect(task)}>
          <span className="text-cozy-800 font-medium text-lg leading-tight block">{task.content}</span>
          
          <div className="flex flex-wrap gap-2 mt-2">
             {list && (
                <span className={`text-[11px] ${list.color} text-cozy-800 px-2 py-1 rounded-md flex items-center gap-1.5 font-bold`}>
                     {list.name}
                </span>
             )}
             {task.dueAt && (
                <span className="text-[11px] bg-cozy-100 text-cozy-500 px-2 py-1 rounded-md flex items-center gap-1.5 font-medium">
                     <CalendarDays size={12} />
                    {new Date(task.dueAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
             )}
             {task.responsible && (
                 <span className="text-[11px] bg-rose-50 text-rose-600 px-2 py-1 rounded-md flex items-center gap-1.5 font-medium">
                     <User size={12} /> {task.responsible}
                 </span>
             )}
             {task.notes && (
                 <span className="text-[11px] text-cozy-400 flex items-center gap-1 py-1">
                     <AlignLeft size={12} />
                 </span>
             )}
          </div>
      </div>
    </motion.div>
  );
};

const Section = ({ title, tasks, color = "text-cozy-900", onTaskSelect }: { title: string; tasks: Task[]; color?: string; onTaskSelect: (t: Task) => void }) => {
  if (!tasks || tasks.length === 0) return null;
  
  return (
    <div className="mb-8">
      <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${color} flex items-center gap-2 px-2`}>
          {title} 
          <span className="px-2 py-0.5 bg-cozy-100 text-cozy-500 rounded-full text-[10px]">{tasks.length}</span>
      </h3>
      <div className="bg-white rounded-3xl shadow-sm border border-cozy-100 px-6 py-2">
        {tasks.map(task => (
          <TaskItem key={task.id} task={task} onSelect={onTaskSelect} />
        ))}
      </div>
    </div>
  );
};

export const AllTasks = () => {
  const allTasks = useLiveQuery(() => 
    db.tasks
      .where('status')
      .noneOf([TaskStatus.DELETED, TaskStatus.DONE])
      .toArray()
  );

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  if (!allTasks) return <div className="p-10 text-center text-cozy-400">Loading...</div>;

  // Grouping Logic
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000;
  const endOfTomorrow = endOfToday + 24 * 60 * 60 * 1000;
  
  const dayOfWeek = now.getDay(); 
  const daysUntilSunday = (7 - dayOfWeek) % 7; 
  const endOfWeek = endOfToday + (daysUntilSunday * 24 * 60 * 60 * 1000); 
  const endOfNextWeek = endOfWeek + 7 * 24 * 60 * 60 * 1000;

  const buckets = {
    overdue: [] as Task[],
    today: [] as Task[],
    tomorrow: [] as Task[],
    laterThisWeek: [] as Task[],
    nextWeek: [] as Task[],
    later: [] as Task[],
    noDate: [] as Task[],
  };

  allTasks.forEach(task => {
    if (task.status === TaskStatus.TODAY) {
      buckets.today.push(task);
      return;
    }

    if (!task.dueAt) {
      buckets.noDate.push(task);
      return;
    }

    const d = task.dueAt;

    if (d < startOfToday) {
      buckets.overdue.push(task);
    } else if (d < endOfToday) {
      buckets.today.push(task);
    } else if (d < endOfTomorrow) {
      buckets.tomorrow.push(task);
    } else if (d < endOfWeek) {
      buckets.laterThisWeek.push(task);
    } else if (d < endOfNextWeek) {
      buckets.nextWeek.push(task);
    } else {
      buckets.later.push(task);
    }
  });

  Object.values(buckets).forEach(arr => arr.sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0)));

  return (
    <div className="min-h-screen pb-32 bg-cozy-50">
      <header className="pt-10 px-6 mb-8">
        <h1 className="text-4xl font-extrabold text-cozy-900 tracking-tight">Agenda</h1>
        <p className="text-cozy-500 font-medium mt-1">The big picture.</p>
      </header>

      <div className="px-4">
        <AnimatePresence>
            <Section title="Overdue" tasks={buckets.overdue} color="text-rose-600" onTaskSelect={setSelectedTask} />
            <Section title="Today" tasks={buckets.today} color="text-indigo-600" onTaskSelect={setSelectedTask} />
            <Section title="Tomorrow" tasks={buckets.tomorrow} onTaskSelect={setSelectedTask} />
            <Section title="Later This Week" tasks={buckets.laterThisWeek} onTaskSelect={setSelectedTask} />
            <Section title="Next Week" tasks={buckets.nextWeek} onTaskSelect={setSelectedTask} />
            <Section title="Later" tasks={buckets.later} onTaskSelect={setSelectedTask} />
            <Section title="No Due Date" tasks={buckets.noDate} color="text-cozy-500" onTaskSelect={setSelectedTask} />

            {allTasks.length === 0 && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-cozy-400"
                >
                    <CalendarDays size={48} className="mb-4 text-cozy-300" />
                    <p>No active tasks found.</p>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedTask && (
            <TaskDetailModal 
                key={selectedTask.id}
                task={selectedTask} 
                onClose={() => setSelectedTask(null)} 
            />
        )}
      </AnimatePresence>
    </div>
  );
};
