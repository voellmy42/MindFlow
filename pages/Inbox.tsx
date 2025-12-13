
import React, { useState } from 'react';
import { TaskStatus, Task } from '../types';
import { QuickCapture } from '../components/QuickCapture';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, CheckCircle2, LogOut } from 'lucide-react';
import { hapticImpact } from '../services/haptics';
import { useAuth } from '../contexts/AuthContext';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { useTasks, useTaskActions, useTriageTasks } from '../hooks/useFireStore'; // IMPORT FIRESTORE Hook
import { playSynthSound } from '../services/sounds';
import { useInstallPrompt } from '../contexts/InstallContext';
import { Download, Bell } from 'lucide-react'; // Added Bell
import { useNotifications } from '../hooks/useNotifications'; // Import Notification Hook

const TaskItem: React.FC<{ task: any, onSelect: (t: Task) => void, onComplete: (task: Task) => void }> = ({ task, onSelect, onComplete }) => {
  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComplete(task);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-4 py-4 px-4 -mx-4 rounded-2xl transition-all hover:bg-white hover:shadow-sm hover:scale-[1.01] group border-b border-cozy-100/50 last:border-0"
    >
      <button onClick={handleComplete} className="text-cozy-300 hover:text-green-500 transition-colors shrink-0">
        <Circle size={24} />
      </button>
      <div className="flex-1 cursor-pointer" onClick={() => onSelect(task)}>
        <span className="text-lg text-cozy-800 font-medium block">{task.content}</span>
      </div>
      {task.source === 'recipe' && (
        <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-50 px-2 py-1 rounded-full shrink-0">
          Recipe
        </span>
      )}
    </motion.div>
  );
};

import { InboxView } from '../components/InboxView';
import { ReviewModal } from '../components/ReviewModal';

export const Inbox = () => {
  const { user, logout } = useAuth();
  const { isInstallable, handleInstallClick } = useInstallPrompt();
  const { permission, requestPermission } = useNotifications(); // Use Notification Hook
  const [showProfile, setShowProfile] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [reviewItem, setReviewItem] = useState<any | null>(null);

  // USE FIRESTORE HOOKS
  const { tasks: todayTasks, updateTask } = useTasks({ status: TaskStatus.TODAY, excludeDeleted: true });
  // We need a separate query for Inbox count if we want to show it.
  // Ideally useTasks supports counting or we fetch all valid tasks and filter locally for small datasets.
  // Use Triage Tasks to count (excludes scheduled items, includes shared)
  const { tasks: inboxTasks } = useTriageTasks();
  const { completeTask } = useTaskActions();

  const handleComplete = (task: Task) => {
    hapticImpact.light();
    playSynthSound('success');
    completeTask(task);
  };

  return (
    <div className="min-h-screen pb-32">
      <header className="pt-10 px-6 mb-2 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-cozy-900">Today</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-cozy-500 font-medium">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            {inboxTasks.length > 0 && (
              <span className="bg-rose-100 text-rose-600 text-xs px-2 py-0.5 rounded-full font-bold">
                {inboxTasks.length} in Inbox
              </span>
            )}
          </div>
        </div>

        {/* User Avatar / Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="w-10 h-10 rounded-full bg-cozy-100 border border-white shadow-sm overflow-hidden active:scale-95 transition-transform"
          >
            <img src={user?.avatar} alt={user?.name} className="w-full h-full object-cover" />
          </button>
          <AnimatePresence>
            {showProfile && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowProfile(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-xl border border-cozy-100 p-2 z-20 origin-top-right"
                >
                  <div className="px-3 py-2 border-b border-cozy-50 mb-1">
                    <p className="text-sm font-bold text-cozy-900 truncate">{user?.name}</p>
                    <p className="text-xs text-cozy-400 truncate">{user?.email || 'Guest Mode'}</p>
                  </div>
                  <button
                    onClick={() => { logout(); }}
                    className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                  {isInstallable && (
                    <button
                      onClick={() => { handleInstallClick(); setShowProfile(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-cozy-700 hover:bg-cozy-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Download size={14} /> Install App
                    </button>
                  )}
                  {permission === 'default' && (
                    <button
                      onClick={() => { requestPermission(); setShowProfile(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-cozy-700 hover:bg-cozy-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Bell size={14} /> Enable Notifications
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="px-6">
        <InboxView onReview={(item) => setReviewItem(item)} hideIfEmpty={true} />
        <AnimatePresence mode='popLayout'>
          {todayTasks.length === 0 ? (
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
            todayTasks.map(task => (
              <TaskItem key={task.id} task={task} onSelect={setSelectedTask} onComplete={handleComplete} />
            ))
          )}
        </AnimatePresence>
      </div>

      <QuickCapture />

      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal
            key={selectedTask.id}
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
          />
        )}
        {reviewItem && (
          <ReviewModal
            item={reviewItem}
            onClose={() => setReviewItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
