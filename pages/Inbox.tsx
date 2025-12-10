import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { TaskStatus } from '../types';
import { QuickCapture } from '../components/QuickCapture';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, CheckCircle2 } from 'lucide-react';
import { hapticImpact } from '../services/haptics';

const TaskItem: React.FC<{ task: any }> = ({ task }) => {
  const handleComplete = (e: React.MouseEvent) => {
      hapticImpact.light();
      db.tasks.update(task.id, { status: TaskStatus.DONE });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-4 py-4 border-b border-cozy-100 group"
    >
      <button onClick={handleComplete} className="text-cozy-300 hover:text-green-500 transition-colors">
        <Circle size={24} />
      </button>
      <span className="text-lg text-cozy-800 font-medium flex-1">{task.content}</span>
      {task.source === 'recipe' && (
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-50 px-2 py-1 rounded-full">
              Recipe
          </span>
      )}
    </motion.div>
  );
};

export const Inbox = () => {
  const todayTasks = useLiveQuery(() => 
    db.tasks.where('status').equals(TaskStatus.TODAY).toArray()
  );

  const inboxCount = useLiveQuery(() => 
    db.tasks.where('status').equals(TaskStatus.INBOX).count()
  );

  return (
    <div className="min-h-screen pb-32">
      <header className="pt-10 px-6 mb-2">
        <h1 className="text-3xl font-bold text-cozy-900">Today</h1>
        <div className="flex items-center gap-2 mt-1">
            <span className="text-cozy-500 font-medium">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            {inboxCount ? (
                 <span className="bg-rose-100 text-rose-600 text-xs px-2 py-0.5 rounded-full font-bold">
                    {inboxCount} in Inbox
                 </span>
            ) : null}
        </div>
      </header>

      <div className="px-6">
        <AnimatePresence mode='popLayout'>
          {todayTasks?.length === 0 ? (
             <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="py-12 text-center"
             >
                 <div className="inline-block p-4 bg-white rounded-full shadow-sm mb-4">
                    <CheckCircle2 size={32} className="text-cozy-300" />
                 </div>
                 <p className="text-cozy-400">No tasks for today.</p>
                 <p className="text-sm text-cozy-300 mt-2">Check your Inbox Triage!</p>
             </motion.div>
          ) : (
             todayTasks?.map(task => (
                <TaskItem key={task.id} task={task} />
             ))
          )}
        </AnimatePresence>
      </div>

      <QuickCapture />
    </div>
  );
};