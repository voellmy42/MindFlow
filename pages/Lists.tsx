
import React, { useState } from 'react';
import { useLists, useTasks } from '../hooks/useFireStore'; // Updated hook
import { TaskStatus } from '../types';
import { hapticImpact } from '../services/haptics';
import { Plus, X, Trash2, ChevronLeft, Circle, Send, Share2, Users, CheckSquare, LayoutGrid, StretchHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = [
  'bg-rose-200', 'bg-orange-200', 'bg-amber-200',
  'bg-green-200', 'bg-emerald-200', 'bg-teal-200',
  'bg-cyan-200', 'bg-sky-200', 'bg-blue-200',
  'bg-indigo-200', 'bg-violet-200', 'bg-purple-200',
  'bg-fuchsia-200', 'bg-pink-200', 'bg-slate-200'
];

const CreateListModal = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const { addList } = useLists();

  const handleSave = async () => {
    if (!name.trim()) return;
    hapticImpact.success();
    await addList({ name, color });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-white animate-in fade-in slide-in-from-bottom-10 duration-200">
      <div className="flex justify-between items-center p-6 border-b border-cozy-100">
        <h2 className="text-xl font-bold text-cozy-900">New List</h2>
        <button onClick={onClose} className="p-2 bg-cozy-50 rounded-full text-cozy-600">
          <X size={24} />
        </button>
      </div>
      <div className="flex-1 p-6">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Shopping"
          className="w-full text-3xl font-bold text-black placeholder:text-gray-400 outline-none bg-transparent appearance-none border-none p-0 mb-8"
        />
        <div className="flex flex-wrap gap-3">
            {COLORS.map(c => (
            <button
                key={c}
                onClick={() => { setColor(c); hapticImpact.light(); }}
                className={`w-10 h-10 rounded-full ${c} transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-cozy-300' : 'hover:scale-110'}`}
            />
            ))}
        </div>
      </div>
      <div className="p-6 border-t border-cozy-100 bg-cozy-50 pb-safe">
        <button onClick={handleSave} className="w-full py-4 bg-cozy-900 text-white rounded-2xl font-bold text-lg shadow-lg">
          Create List
        </button>
      </div>
    </div>
  );
};

const ListDetailView = ({ list, onClose }: { list: any, onClose: () => void }) => {
    const [input, setInput] = useState('');
    // Pass listId to filter tasks for this specific list
    const { tasks, addTask, updateTask } = useTasks({ listId: list.id, excludeDeleted: true });
    
    const displayTasks = tasks.filter(t => t.status !== TaskStatus.DONE);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        hapticImpact.success();
        await addTask({ content: input, listId: list.id });
        setInput('');
    };

    const toggleTask = (taskId: string) => {
        hapticImpact.light();
        updateTask(taskId, { status: TaskStatus.DONE });
    };

    return (
        <div className="fixed inset-0 z-[100] bg-cozy-50 flex flex-col h-[100dvh] animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className={`shrink-0 ${list.color} px-6 pt-6 pb-6`}>
                 <div className="flex justify-between items-center -ml-3 mb-2">
                    <button onClick={onClose} className="p-3 rounded-full hover:bg-black/5 text-cozy-900">
                        <ChevronLeft size={28} />
                    </button>
                    <button onClick={() => { alert('Sharing is managed via Firebase permissions!'); }} className="p-3 rounded-full hover:bg-black/5 text-cozy-900">
                         <Share2 size={24} />
                    </button>
                </div>
                <h1 className="text-4xl font-extrabold text-cozy-900 leading-tight">{list.name}</h1>
                <p className="text-cozy-900/60 font-bold text-sm mt-1 uppercase tracking-wide opacity-80">
                     {displayTasks.length} Items
                </p>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                 <div className="space-y-2">
                     {displayTasks.map((task: any) => (
                         <div key={task.id} className="flex items-center gap-3 py-3 border-b border-cozy-200 group">
                             <button onClick={() => toggleTask(task.id)} className="text-cozy-400 hover:text-green-500 shrink-0">
                                 <Circle size={24} />
                             </button>
                             <div className="flex-1 min-w-0">
                                 <span className="text-lg text-cozy-800 break-words block">{task.content}</span>
                             </div>
                         </div>
                     ))}
                      {displayTasks.length === 0 && (
                         <div className="text-center text-cozy-400 py-10">
                             <CheckSquare size={48} className="mx-auto mb-2 opacity-50" />
                             <p>List is empty</p>
                         </div>
                     )}
                 </div>
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-cozy-200 pb-safe shrink-0">
                <form onSubmit={handleAdd} className="flex items-center gap-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        className="flex-1 bg-cozy-100 rounded-xl px-4 py-3 outline-none text-cozy-900 placeholder:text-cozy-400"
                        placeholder={`Add to ${list.name}...`}
                    />
                    <button type="submit" disabled={!input} className="p-3 bg-cozy-900 text-white rounded-xl">
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export const Lists = () => {
    const { lists } = useLists(); 
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isCreating, setIsCreating] = useState(false);
    const [activeList, setActiveList] = useState<any | null>(null);

    return (
        <div className="pt-10 px-6 pb-24 min-h-screen flex flex-col">
            <header className="mb-6">
                 <h1 className="text-3xl font-bold text-cozy-900">Cloud Lists</h1>
                 <p className="text-cozy-500">Real-time sync enabled.</p>
            </header>

            <div className="flex justify-end mb-4 px-1">
                 <div className="bg-cozy-100 p-1 rounded-xl flex gap-1">
                     <button 
                        onClick={() => { setViewMode('list'); hapticImpact.light(); }}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-cozy-900' : 'text-cozy-400 hover:text-cozy-600'}`}
                     >
                        <StretchHorizontal size={18} />
                     </button>
                     <button 
                        onClick={() => { setViewMode('grid'); hapticImpact.light(); }}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-cozy-900' : 'text-cozy-400 hover:text-cozy-600'}`}
                     >
                        <LayoutGrid size={18} />
                     </button>
                 </div>
            </div>

            <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-300">
                 <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                    {lists.map(list => (
                        <motion.button
                            layout
                            key={list.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveList(list)}
                            className={`rounded-3xl ${list.color || 'bg-cozy-100'} shadow-sm border border-black/5 relative overflow-hidden group transition-all ${viewMode === 'grid' ? 'aspect-square p-6 flex flex-col justify-between text-left' : 'h-20 px-5 flex flex-row items-center gap-4 text-left'}`}
                        >
                            <div>
                                <h3 className="text-xl font-bold text-cozy-900 leading-tight mb-1">{list.name}</h3>
                                {list.role === 'editor' && <Users size={16} className="opacity-40" />}
                            </div>
                        </motion.button>
                    ))}
                    
                    <motion.button
                        layout
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsCreating(true)}
                        className={`rounded-3xl border-2 border-dashed border-cozy-200 flex items-center justify-center text-cozy-300 hover:text-cozy-500 hover:border-cozy-300 transition-colors ${viewMode === 'grid' ? 'aspect-square flex-col' : 'h-20 flex-row gap-2'}`}
                    >
                        <Plus size={viewMode === 'grid' ? 32 : 24} />
                        <span className="font-bold text-sm">New List</span>
                    </motion.button>
                 </div>
            </div>
            
            <AnimatePresence>
                {isCreating && <CreateListModal onClose={() => setIsCreating(false)} />}
                {activeList && <ListDetailView list={activeList} onClose={() => setActiveList(null)} />}
            </AnimatePresence>
        </div>
    );
};
