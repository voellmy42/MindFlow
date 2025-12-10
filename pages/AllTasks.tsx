import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Task, TaskStatus } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, CalendarDays, X, User, AlignLeft, Calendar as CalendarIcon, Save, ChevronLeft, ChevronRight, Slash } from 'lucide-react';
import { hapticImpact } from '../services/haptics';

// --- Calendar Picker Component ---
const CalendarPicker = ({ selectedDate, onSelect, onClose }: { selectedDate: Date | null, onSelect: (d: Date | null) => void, onClose: () => void }) => {
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  
  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const handleDateClick = (day: number) => {
    hapticImpact.light();
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    // Set to noon to avoid timezone weirdness
    newDate.setHours(12, 0, 0, 0);
    onSelect(newDate);
    onClose();
  };

  const handleQuickSelect = (type: 'today' | 'tomorrow' | 'nextWeek' | 'none') => {
    hapticImpact.medium();
    const now = new Date();
    let target: Date | null = new Date();
    
    switch (type) {
        case 'today':
            break;
        case 'tomorrow':
            target.setDate(now.getDate() + 1);
            break;
        case 'nextWeek':
            target.setDate(now.getDate() + 7);
            break;
        case 'none':
            target = null;
            break;
    }
    
    if (target) target.setHours(12, 0, 0, 0);
    onSelect(target);
    onClose();
  };

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="absolute inset-x-0 bottom-0 top-20 bg-white rounded-t-[2rem] z-50 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.1)] overflow-hidden"
    >
        <div className="flex justify-between items-center p-6 pb-2">
            <h3 className="text-xl font-bold text-cozy-900">Select Date</h3>
            <button onClick={onClose} className="p-2 bg-cozy-50 rounded-full text-cozy-500">
                <X size={20} />
            </button>
        </div>

        {/* Quick Select Chips */}
        <div className="flex gap-2 px-6 pb-6 overflow-x-auto no-scrollbar">
             <button onClick={() => handleQuickSelect('today')} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-semibold whitespace-nowrap">Today</button>
             <button onClick={() => handleQuickSelect('tomorrow')} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-semibold whitespace-nowrap">Tomorrow</button>
             <button onClick={() => handleQuickSelect('nextWeek')} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-semibold whitespace-nowrap">Next Week</button>
             <button onClick={() => handleQuickSelect('none')} className="px-4 py-2 bg-cozy-100 text-cozy-600 rounded-full text-sm font-semibold whitespace-nowrap flex items-center gap-1"><Slash size={12}/> No Date</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8">
            {/* Month Nav */}
            <div className="flex justify-between items-center mb-6">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-cozy-50 rounded-full"><ChevronLeft className="text-cozy-400" /></button>
                <span className="text-lg font-bold text-cozy-800">
                    {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={handleNextMonth} className="p-2 hover:bg-cozy-50 rounded-full"><ChevronRight className="text-cozy-400" /></button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-y-4 mb-4 text-center">
                {weekDays.map(d => (
                    <div key={d} className="text-xs font-bold text-cozy-300">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-y-2 place-items-center">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const currentDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                    const isSelected = selectedDate && 
                        currentDate.getDate() === selectedDate.getDate() && 
                        currentDate.getMonth() === selectedDate.getMonth() &&
                        currentDate.getFullYear() === selectedDate.getFullYear();
                    
                    const isToday = new Date().toDateString() === currentDate.toDateString();

                    return (
                        <button
                            key={day}
                            onClick={() => handleDateClick(day)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                                ${isSelected 
                                    ? 'bg-cozy-900 text-white shadow-lg shadow-cozy-200 scale-110' 
                                    : isToday 
                                        ? 'bg-indigo-50 text-indigo-600 font-bold'
                                        : 'text-cozy-700 hover:bg-cozy-50'
                                }
                            `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    </motion.div>
  );
};

// --- Task Detail Modal ---
const TaskDetailModal: React.FC<{ task: Task; onClose: () => void }> = ({ task, onClose }) => {
  const [content, setContent] = useState(task.content);
  // Store internal date state as a Date object or null
  const [dueAt, setDueAt] = useState<Date | null>(task.dueAt ? new Date(task.dueAt) : null);
  const [responsible, setResponsible] = useState(task.responsible || '');
  const [notes, setNotes] = useState(task.notes || '');
  const [showCalendar, setShowCalendar] = useState(false);

  const handleSave = async () => {
    hapticImpact.success();
    await db.tasks.update(task.id!, {
      content,
      dueAt: dueAt ? dueAt.getTime() : undefined,
      responsible,
      notes
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
      />

      {/* Modal Card */}
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl pointer-events-auto flex flex-col h-[85vh] relative z-10 overflow-hidden"
      >
        {/* Drag Handle Indicator */}
        <div className="w-full flex justify-center pt-3 pb-1 shrink-0" onClick={onClose}>
            <div className="w-12 h-1.5 bg-cozy-200 rounded-full" />
        </div>

        <div className="px-6 pb-2 flex justify-end shrink-0">
             <button onClick={onClose} className="p-2 -mr-2 text-cozy-400 bg-cozy-50 rounded-full hover:bg-cozy-100 hover:text-cozy-800 transition-colors">
                <X size={20} />
            </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full text-3xl font-extrabold text-cozy-900 bg-transparent border-none outline-none resize-none p-0 mb-8 leading-tight placeholder:text-cozy-200"
                rows={2}
                placeholder="What needs to be done?"
            />

            <div className="space-y-4">
                {/* Due Date - Full Row Clickable */}
                <div 
                    onClick={() => setShowCalendar(true)}
                    className="relative group flex items-center gap-4 p-4 bg-cozy-50 rounded-2xl border border-transparent active:scale-[0.98] transition-all cursor-pointer"
                >
                    <div className="p-3 bg-white shadow-sm text-indigo-600 rounded-xl">
                        <CalendarIcon size={24} />
                    </div>
                    <div className="flex-1">
                            <div className="text-xs font-bold text-cozy-400 uppercase tracking-wide mb-1">Due Date</div>
                            <div className="text-lg font-medium text-cozy-900">
                            {dueAt ? dueAt.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' }) : <span className="text-cozy-400">Set a date...</span>}
                            </div>
                    </div>
                </div>

                {/* Responsible */}
                <div className="flex items-center gap-4 p-4 bg-cozy-50 rounded-2xl border border-transparent focus-within:border-rose-200 focus-within:bg-rose-50/30 transition-all">
                    <div className="p-3 bg-white shadow-sm text-rose-600 rounded-xl">
                        <User size={24} />
                    </div>
                    <div className="flex-1">
                        <div className="text-xs font-bold text-cozy-400 uppercase tracking-wide mb-1">Assigned To</div>
                        <input 
                            type="text"
                            value={responsible}
                            onChange={(e) => setResponsible(e.target.value)}
                            placeholder="Add person..."
                            className="w-full bg-transparent text-lg font-medium text-cozy-900 outline-none placeholder:text-cozy-400"
                        />
                    </div>
                </div>

                {/* Notes */}
                <div className="p-4 bg-cozy-50 rounded-2xl border border-transparent focus-within:border-amber-200 focus-within:bg-amber-50/30 transition-all flex flex-col gap-3 min-h-[180px]">
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-white shadow-sm text-amber-600 rounded-lg">
                            <AlignLeft size={20} />
                        </div>
                        <div className="text-xs font-bold text-cozy-400 uppercase tracking-wide">Notes</div>
                    </div>
                    <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add details, subtasks, or links..."
                        className="w-full flex-1 bg-transparent text-lg text-cozy-800 outline-none placeholder:text-cozy-400 resize-none leading-relaxed"
                    />
                </div>
            </div>
        </div>

        {/* Sticky Footer */}
        <div className="p-6 border-t border-cozy-100 bg-white/90 backdrop-blur-md pb-8 sm:pb-6 rounded-b-[2rem] shrink-0">
             <button 
                onClick={handleSave}
                className="w-full py-4 bg-cozy-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-cozy-200 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
            >
                <Save size={24} />
                Save Changes
            </button>
        </div>

        {/* Calendar Overlay */}
        <AnimatePresence>
            {showCalendar && (
                <CalendarPicker 
                    selectedDate={dueAt} 
                    onSelect={setDueAt} 
                    onClose={() => setShowCalendar(false)} 
                />
            )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};


// --- Task Item ---
const TaskItem: React.FC<{ task: Task; onSelect: (t: Task) => void }> = ({ task, onSelect }) => {
  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticImpact.light();
    db.tasks.update(task.id, { status: TaskStatus.DONE });
  };

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