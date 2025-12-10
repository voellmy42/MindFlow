import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion';
import { db } from '../db';
import { Task, TaskStatus } from '../types';
import { hapticImpact } from '../services/haptics';
import { Check, Clock, Trash2, ArrowRight } from 'lucide-react';

const Card: React.FC<{ task: Task; onSwipe: (dir: 'left' | 'right' | 'down') => void }> = ({ task, onSwipe }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-150, 0, 150], [-15, 0, 15]);
  
  // Background colors based on drag direction
  const rightOpacity = useTransform(x, [0, 100], [0, 1]);
  const leftOpacity = useTransform(x, [0, -100], [0, 1]);
  const downOpacity = useTransform(y, [0, 100], [0, 1]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      onSwipe('right');
    } else if (info.offset.x < -threshold) {
      onSwipe('left');
    } else if (info.offset.y > threshold) {
      onSwipe('down');
    }
  };

  return (
    <motion.div
      style={{ x, y, rotate }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 1.05, cursor: 'grabbing' }}
      className="absolute top-0 w-full h-full max-h-[60vh] aspect-[3/4] bg-white rounded-3xl shadow-xl border border-cozy-100 flex flex-col items-center justify-center p-8 select-none cursor-grab overflow-hidden"
    >
        {/* Swipe Indicators Overlay */}
        <motion.div style={{ opacity: rightOpacity }} className="absolute inset-0 bg-green-500/20 pointer-events-none flex items-center justify-center">
            <Check size={80} className="text-green-600 translate-x-12" />
        </motion.div>
        <motion.div style={{ opacity: leftOpacity }} className="absolute inset-0 bg-amber-400/20 pointer-events-none flex items-center justify-center">
             <Clock size={80} className="text-amber-600 -translate-x-12" />
        </motion.div>
        <motion.div style={{ opacity: downOpacity }} className="absolute inset-0 bg-red-500/20 pointer-events-none flex items-center justify-center">
             <Trash2 size={80} className="text-red-600 translate-y-12" />
        </motion.div>

      <div className="flex-1 flex items-center justify-center text-center">
        <h2 className="text-3xl font-bold text-cozy-800 leading-tight">{task.content}</h2>
      </div>
      <div className="text-cozy-400 text-sm font-medium mt-auto">
        Added {new Date(task.createdAt).toLocaleDateString()}
      </div>
    </motion.div>
  );
};

export const Triage = () => {
  const inboxTasks = useLiveQuery(() => 
    db.tasks.where('status').equals(TaskStatus.INBOX).reverse().toArray()
  );

  const handleSwipe = async (id: number, direction: 'left' | 'right' | 'down') => {
    hapticImpact.medium();
    
    let newStatus = TaskStatus.INBOX;
    let dueAt = undefined;

    switch (direction) {
      case 'right': // Today
        newStatus = TaskStatus.TODAY;
        hapticImpact.success();
        break;
      case 'left': // Snooze
        newStatus = TaskStatus.SNOOZED;
        dueAt = Date.now() + 24 * 60 * 60 * 1000; // +1 Day
        break;
      case 'down': // Delete
        newStatus = TaskStatus.DELETED;
        hapticImpact.error();
        break;
    }

    await db.tasks.update(id, { status: newStatus, dueAt });
  };

  if (!inboxTasks) return <div className="p-8 text-center text-cozy-400">Loading...</div>;

  return (
    <div className="h-full flex flex-col items-center pt-10 px-6 relative overflow-hidden bg-cozy-50">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-cozy-900">Spring Session</h1>
        <p className="text-cozy-500">Sort your inbox to find flow.</p>
      </div>

      <div className="relative w-full max-w-sm h-[60vh] z-10">
        <AnimatePresence>
          {inboxTasks.length > 0 ? (
            // Only render the top 2 cards for performance, but key by ID
            inboxTasks.slice(0, 2).map((task, index) => (
              <Card 
                key={task.id} 
                task={task} 
                onSwipe={(dir) => handleSwipe(task.id!, dir)} 
              />
            )).reverse() // Reverse so the first element is on top in DOM order (if using absolute) or z-index handled
          ) : (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex flex-col items-center justify-center h-full text-cozy-400"
            >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Check size={40} className="text-green-600" />
                </div>
                <h3 className="text-xl font-medium text-cozy-700">Inbox Zero</h3>
                <p>You're all caught up!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {inboxTasks.length > 0 && (
        <div className="mt-8 flex justify-between w-full max-w-xs text-sm font-medium text-cozy-400">
           <div className="flex flex-col items-center"><Clock size={20} className="mb-1"/> Snooze</div>
           <div className="flex flex-col items-center"><Trash2 size={20} className="mb-1"/> Delete</div>
           <div className="flex flex-col items-center"><Check size={20} className="mb-1"/> Today</div>
        </div>
      )}
    </div>
  );
};