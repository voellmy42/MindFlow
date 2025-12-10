
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'react-router-dom';
import { db } from '../db';
import { Recipe, TaskStatus, List, Task } from '../types';
import { hapticImpact } from '../services/haptics';
import { Plus, X, Trash2, Calendar, Check, ArrowRight, Play, CheckSquare, Zap, ChevronLeft, Circle, Send, Share2, Users, Copy, CheckCircle, Link as LinkIcon, LayoutGrid, StretchHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Constants ---
const COLORS = [
  'bg-rose-200', 'bg-orange-200', 'bg-amber-200',
  'bg-green-200', 'bg-emerald-200', 'bg-teal-200',
  'bg-cyan-200', 'bg-sky-200', 'bg-blue-200',
  'bg-indigo-200', 'bg-violet-200', 'bg-purple-200',
  'bg-fuchsia-200', 'bg-pink-200', 'bg-slate-200'
];

// --- Helper Functions ---
const extractVariables = (strings: string[]): string[] => {
  const variableRegex = /{([^}]+)}/g;
  const vars = new Set<string>();
  strings.forEach(s => {
    let match;
    while ((match = variableRegex.exec(s)) !== null) {
      vars.add(match[1]);
    }
  });
  return Array.from(vars);
};

// Safe Base64 Encoding/Decoding for Unicode
const safeBtoa = (str: string) => {
    try {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode(parseInt('0x' + p1));
        }));
    } catch (e) { return ''; }
}

const safeAtob = (str: string) => {
    try {
        return decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    } catch (e) { return '{}'; }
}

// --- COMPONENTS FOR LISTS ---

const CreateListModal = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const handleSave = async () => {
    if (!name.trim()) return;
    hapticImpact.success();
    await db.lists.add({
      name,
      color,
      createdAt: Date.now(),
      role: 'owner'
    });
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
        <div className="mb-8">
          <label className="block text-xs font-bold uppercase text-cozy-400 mb-2">List Name</label>
          <input
            autoFocus
            autoComplete="off"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Shopping"
            className="w-full text-3xl font-bold text-black placeholder:text-gray-400 outline-none bg-transparent appearance-none border-none p-0"
          />
        </div>
        <div>
           <label className="block text-xs font-bold uppercase text-cozy-400 mb-3">Color</label>
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
      </div>
      <div className="p-6 border-t border-cozy-100 bg-cozy-50 pb-safe">
        <button
          onClick={handleSave}
          className="w-full py-4 bg-cozy-900 text-white rounded-2xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all"
        >
          Create List
        </button>
      </div>
    </div>
  );
};

// --- Share Modal ---
const ShareListModal = ({ list, tasks, onClose }: { list: List, tasks: Task[] | undefined, onClose: () => void }) => {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    // Generate Snapshot URL
    const payload = {
        list: { name: list.name, color: list.color },
        tasks: tasks?.map(t => ({ content: t.content, status: t.status, notes: t.notes, dueAt: t.dueAt })) || []
    };
    try {
        const token = safeBtoa(JSON.stringify(payload));
        const url = `${window.location.origin}${window.location.pathname}#/lists?invite=${token}`;
        setShareUrl(url);
    } catch (e) {
        console.error("Failed to generate share link", e);
    }
  }, [list, tasks]);

  const handleCopy = async () => {
    hapticImpact.success();
    try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    } catch (err) {
        console.error("Failed to copy", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
         <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm overflow-hidden"
         >
            <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-3">
                     <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                         <Users size={24} />
                     </div>
                     <h3 className="text-xl font-bold text-cozy-900">Invite Friends</h3>
                 </div>
                 <button onClick={onClose} className="p-2 bg-cozy-50 rounded-full text-cozy-400">
                     <X size={20} />
                 </button>
            </div>

            <p className="text-cozy-500 mb-6 leading-relaxed">
                Share <span className="font-bold text-cozy-800">{list.name}</span> with others. They will be able to add and edit tasks.
            </p>

            <div className="bg-cozy-50 p-4 rounded-xl flex items-center gap-3 mb-6 border border-cozy-100 overflow-hidden">
                <LinkIcon size={18} className="text-cozy-400 shrink-0" />
                <div className="flex-1 truncate text-xs text-cozy-600 font-medium font-mono select-all">
                    {shareUrl}
                </div>
            </div>

            <button 
                onClick={handleCopy}
                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-cozy-900 text-white'}`}
            >
                {copied ? <><CheckCircle size={20} /> Copied!</> : <><Copy size={20} /> Copy Link</>}
            </button>
         </motion.div>
    </div>
  );
};

// --- Accept Invite Modal ---
const AcceptInviteModal = ({ inviteData, onAccept, onCancel }: { inviteData: any, onAccept: () => void, onCancel: () => void }) => {
    return (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <motion.div 
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center"
            >
                <div className={`w-20 h-20 mx-auto rounded-full ${inviteData.list.color} flex items-center justify-center mb-6 shadow-inner`}>
                    <Users size={40} className="text-cozy-800 opacity-50" />
                </div>
                
                <h2 className="text-2xl font-extrabold text-cozy-900 mb-2">Join List?</h2>
                <p className="text-cozy-500 mb-8">
                    You've been invited to collaborate on <br/>
                    <strong className="text-cozy-900 text-lg">"{inviteData.list.name}"</strong>
                </p>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={onAccept}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 active:scale-[0.98] transition-transform"
                    >
                        Accept Invite
                    </button>
                    <button 
                        onClick={onCancel}
                        className="w-full py-4 text-cozy-400 font-bold hover:text-cozy-600 transition-colors"
                    >
                        No thanks
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// --- Delete Confirmation Modal ---
const DeleteConfirmationModal = ({ 
    title, 
    message, 
    onConfirm, 
    onCancel 
}: { 
    title: string; 
    message: string; 
    onConfirm: () => void; 
    onCancel: () => void 
}) => {
    return (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm"
            >
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4">
                    <Trash2 size={24} />
                </div>
                <h3 className="text-xl font-bold text-cozy-900 mb-2">{title}</h3>
                <p className="text-cozy-500 mb-6">{message}</p>
                
                <div className="flex gap-3">
                    <button 
                        onClick={onCancel}
                        className="flex-1 py-3 px-4 bg-cozy-100 hover:bg-cozy-200 text-cozy-700 font-bold rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-md transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const ListDetailView = ({ list, onClose }: { list: List, onClose: () => void }) => {
    const [input, setInput] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    
    // Check permissions
    const isOwner = list.role !== 'editor';

    const tasks = useLiveQuery(() => 
        db.tasks.where('listId').equals(list.id!).and(t => t.status !== TaskStatus.DELETED && t.status !== TaskStatus.DONE).toArray()
    , [list.id]);

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        hapticImpact.success();
        await db.tasks.add({
            content: input,
            status: TaskStatus.INBOX,
            listId: list.id,
            createdAt: Date.now(),
            source: 'manual'
        });
        setInput('');
    };

    const confirmDelete = async () => {
        hapticImpact.heavy();
        try {
            await db.lists.delete(list.id!);
            const associatedTaskKeys = await db.tasks.where('listId').equals(list.id!).primaryKeys();
            if (associatedTaskKeys.length > 0) {
                await db.tasks.bulkDelete(associatedTaskKeys as number[]);
            }
            onClose();
        } catch (err) {
            console.error("Error deleting list:", err);
        }
    };
    
    const toggleTask = (taskId: number) => {
        hapticImpact.light();
        db.tasks.update(taskId, { status: TaskStatus.DONE });
    };

    return (
        <div className="fixed inset-0 z-[100] bg-cozy-50 flex flex-col h-[100dvh] animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className={`shrink-0 ${list.color} transition-all duration-300 ease-in-out`}>
                <div className="px-6 pt-6 pb-6">
                     <div className="flex justify-between items-center -ml-3 -mr-3 mb-2 relative z-10">
                        <button 
                            onClick={onClose} 
                            className="p-3 rounded-full hover:bg-black/5 active:bg-black/10 transition-colors text-cozy-900"
                        >
                            <ChevronLeft size={28} />
                        </button>
                        
                        <div className="flex gap-1">
                            <button 
                                onClick={() => { hapticImpact.medium(); setShowShareModal(true); }}
                                className="p-3 rounded-full hover:bg-black/5 active:bg-black/10 transition-colors text-cozy-900"
                            >
                                <Share2 size={24} />
                            </button>
                            {isOwner && (
                                <button 
                                    onClick={() => { hapticImpact.medium(); setShowDeleteConfirm(true); }}
                                    className="p-3 rounded-full hover:bg-black/5 active:bg-black/10 transition-colors text-cozy-900"
                                >
                                    <Trash2 size={24} />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div>
                        <h1 className="text-4xl font-extrabold text-cozy-900 leading-tight tracking-tight break-words">{list.name}</h1>
                        <p className="text-cozy-900/60 font-bold text-sm mt-1 uppercase tracking-wide opacity-80">
                            {tasks?.length || 0} Tasks {isOwner ? '' : '(Shared)'}
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                 <div className="space-y-2">
                     {tasks?.map(task => (
                         <div key={task.id} className="flex items-center gap-3 py-3 border-b border-cozy-200 group">
                             <button onClick={() => toggleTask(task.id!)} className="text-cozy-400 hover:text-green-500 shrink-0">
                                 <Circle size={24} />
                             </button>
                             <div className="flex-1 min-w-0">
                                 <span className="text-lg text-cozy-800 break-words block">{task.content}</span>
                             </div>
                             <button 
                                onClick={() => db.tasks.update(task.id!, { status: TaskStatus.DELETED })}
                                className="opacity-0 group-hover:opacity-100 text-cozy-300 hover:text-red-500 p-2 transition-all"
                             >
                                <Trash2 size={16} />
                             </button>
                         </div>
                     ))}
                     {tasks?.length === 0 && (
                         <div className="text-center text-cozy-400 py-10">
                             <CheckSquare size={48} className="mx-auto mb-2 opacity-50" />
                             <p>List is empty</p>
                         </div>
                     )}
                 </div>
            </div>

            {/* Input Footer */}
            <div className="p-4 bg-white border-t border-cozy-200 pb-safe shrink-0 z-[110]">
                <form onSubmit={handleAddTask} className="flex items-center gap-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        className="flex-1 bg-cozy-100 rounded-xl px-4 py-3 outline-none text-cozy-900 placeholder:text-cozy-400"
                        placeholder={`Add to ${list.name}...`}
                    />
                    <button type="submit" disabled={!input} className="p-3 bg-cozy-900 text-white rounded-xl disabled:opacity-50">
                        <Send size={20} />
                    </button>
                </form>
            </div>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <DeleteConfirmationModal 
                        title={`Delete ${list.name}?`}
                        message="This will permanently remove the list and all its pending tasks. This action cannot be undone."
                        onConfirm={confirmDelete}
                        onCancel={() => setShowDeleteConfirm(false)}
                    />
                )}
                {showShareModal && (
                    <ShareListModal 
                        list={list} 
                        tasks={tasks}
                        onClose={() => setShowShareModal(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};


// --- COMPONENTS FOR RECIPES (Previously Recipes.tsx) ---

const CreateRecipeModal = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState('');
  const [tasks, setTasks] = useState<string[]>(['']);
  const [color, setColor] = useState(COLORS[0]);

  const handleAddTask = () => setTasks([...tasks, '']);
  const handleUpdateTask = (idx: number, val: string) => {
    const newTasks = [...tasks];
    newTasks[idx] = val;
    setTasks(newTasks);
  };
  const handleRemoveTask = (idx: number) => {
    setTasks(tasks.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const validTasks = tasks.filter(t => t.trim());
    if (validTasks.length === 0) return;

    hapticImpact.success();
    await db.recipes.add({
      name,
      template: name,
      taskTemplates: validTasks,
      color
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-white animate-in fade-in slide-in-from-bottom-10 duration-200">
      <div className="flex justify-between items-center p-6 border-b border-cozy-100">
        <h2 className="text-xl font-bold text-cozy-900">New Recipe</h2>
        <button onClick={onClose} className="p-2 bg-cozy-50 rounded-full text-cozy-600">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-32">
        {/* Name */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase text-cozy-400 mb-2">Recipe Name</label>
          <input
            autoFocus
            autoComplete="off"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Morning Routine"
            className="w-full text-2xl font-bold text-black placeholder:text-gray-400 outline-none bg-transparent appearance-none border-none p-0"
          />
        </div>

        {/* Color Picker */}
        <div className="mb-8">
           <label className="block text-xs font-bold uppercase text-cozy-400 mb-3">Color</label>
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

        {/* Tasks */}
        <div>
          <label className="block text-xs font-bold uppercase text-cozy-400 mb-3">Tasks</label>
          <div className="space-y-3">
            {tasks.map((task, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cozy-300" />
                <input
                  type="text"
                  value={task}
                  onChange={e => handleUpdateTask(idx, e.target.value)}
                  placeholder="Do something..."
                  className="flex-1 text-lg text-cozy-800 outline-none placeholder:text-cozy-300"
                  onKeyDown={e => {
                      if (e.key === 'Enter') handleAddTask();
                      if (e.key === 'Backspace' && task === '' && tasks.length > 1) handleRemoveTask(idx);
                  }}
                />
                {tasks.length > 1 && (
                    <button onClick={() => handleRemoveTask(idx)} className="text-cozy-300 hover:text-red-400 p-2">
                        <Trash2 size={18} />
                    </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={handleAddTask}
            className="mt-4 flex items-center gap-2 text-indigo-600 font-medium py-2 px-2 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Plus size={20} /> Add Item
          </button>
        </div>
      </div>

      <div className="p-6 border-t border-cozy-100 bg-cozy-50 pb-safe">
        <button
          onClick={handleSave}
          className="w-full py-4 bg-cozy-900 text-white rounded-2xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all"
        >
          Create Recipe
        </button>
      </div>
    </div>
  );
};

const RunRecipeModal = ({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) => {
  const variables = extractVariables(recipe.taskTemplates);
  const hasVariables = variables.length > 0;
  
  const [step, setStep] = useState<'VARS' | 'DATE'>(hasVariables ? 'VARS' : 'DATE');
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  
  const handleGenerate = async (dateOffset: number | null) => {
    hapticImpact.success();
    
    let dueAt: number | undefined;
    if (dateOffset !== null) {
        const d = new Date();
        d.setDate(d.getDate() + dateOffset);
        d.setHours(12, 0, 0, 0); 
        dueAt = d.getTime();
    }

    const tasksToAdd = recipe.taskTemplates.map(tmpl => {
      let content = tmpl;
      Object.entries(varValues).forEach(([key, val]) => {
          content = content.replace(new RegExp(`{${key}}`, 'g'), val);
      });
      return {
        content,
        status: dueAt ? TaskStatus.TODAY : TaskStatus.INBOX,
        dueAt,
        createdAt: Date.now(),
        source: 'recipe'
      };
    });

    await db.tasks.bulkAdd(tasksToAdd as any);
    onClose();
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this recipe?")) {
        hapticImpact.heavy();
        await db.recipes.delete(recipe.id!);
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-3xl p-6 shadow-2xl overflow-hidden"
      >
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-cozy-900">{recipe.name}</h3>
            <div className="flex gap-2">
                <button onClick={handleDelete} className="p-2 bg-red-50 rounded-full text-red-500 hover:bg-red-100 transition-colors">
                    <Trash2 size={20} />
                </button>
                <button onClick={onClose} className="p-2 bg-cozy-50 rounded-full text-cozy-400 hover:bg-cozy-100 transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>

        {step === 'VARS' && (
            <div className="space-y-6">
                <p className="text-cozy-500">Fill in the details:</p>
                {variables.map(v => (
                    <div key={v}>
                        <label className="block text-xs font-bold uppercase text-cozy-400 mb-1">{v}</label>
                        <input 
                            autoFocus={v === variables[0]}
                            type={v.includes('days') || v.includes('number') ? 'number' : 'text'}
                            value={varValues[v] || ''}
                            onChange={(e) => setVarValues({...varValues, [v]: e.target.value})}
                            className="w-full text-xl border-b-2 border-cozy-200 focus:border-indigo-500 outline-none py-2 text-cozy-900 bg-transparent"
                            placeholder="..."
                        />
                    </div>
                ))}
                <button 
                    disabled={Object.keys(varValues).length < variables.length}
                    onClick={() => setStep('DATE')}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next
                </button>
            </div>
        )}

        {step === 'DATE' && (
            <div>
                <p className="text-cozy-500 mb-6">When should these be done?</p>
                <div className="grid grid-cols-1 gap-3">
                    <button 
                        onClick={() => handleGenerate(0)}
                        className="p-4 bg-indigo-50 text-indigo-700 rounded-2xl font-bold text-lg flex items-center justify-between group active:scale-[0.98] transition-all"
                    >
                        <span>Today</span>
                        <Calendar size={24} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button 
                        onClick={() => handleGenerate(1)}
                        className="p-4 bg-cozy-100 text-cozy-700 rounded-2xl font-bold text-lg flex items-center justify-between group active:scale-[0.98] transition-all"
                    >
                        <span>Tomorrow</span>
                        <ArrowRight size={24} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button 
                        onClick={() => handleGenerate(null)}
                        className="p-4 border-2 border-cozy-100 text-cozy-400 rounded-2xl font-bold text-lg flex items-center justify-between group active:scale-[0.98] transition-all hover:bg-cozy-50"
                    >
                        <span>No Due Date</span>
                        <Check size={24} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>
            </div>
        )}
      </motion.div>
    </div>
  );
};


// --- MAIN PAGE ---

export const Lists = () => {
    const [tab, setTab] = useState<'lists' | 'recipes'>('lists');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    // Data
    const lists = useLiveQuery(() => db.lists.toArray());
    const recipes = useLiveQuery(() => db.recipes.toArray());
    
    // UI State
    const [isCreatingList, setIsCreatingList] = useState(false);
    const [isCreatingRecipe, setIsCreatingRecipe] = useState(false);
    const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
    const [activeList, setActiveList] = useState<List | null>(null);

    // Invite Handling
    const [searchParams, setSearchParams] = useSearchParams();
    const [inviteData, setInviteData] = useState<any | null>(null);

    useEffect(() => {
        const inviteCode = searchParams.get('invite');
        if (inviteCode) {
            try {
                const data = JSON.parse(safeAtob(inviteCode));
                if (data && data.list) {
                    setInviteData(data);
                }
            } catch (e) {
                console.error("Invalid invite code");
            }
        }
    }, [searchParams]);

    const handleAcceptInvite = async () => {
        if (!inviteData) return;
        hapticImpact.success();
        
        // Create List with EDITOR role
        const listId = await db.lists.add({
            name: inviteData.list.name,
            color: inviteData.list.color,
            createdAt: Date.now(),
            role: 'editor' // Enforce role
        });

        // Add Tasks
        if (inviteData.tasks && inviteData.tasks.length > 0) {
            const tasks = inviteData.tasks.map((t: any) => ({
                ...t,
                listId,
                createdAt: Date.now(),
                // Reset status to INBOX unless specified, but for snapshot we usually keep as is or default to Inbox
                // Let's keep status if it makes sense, or default to INBOX for new users
                status: TaskStatus.INBOX 
            }));
            await db.tasks.bulkAdd(tasks);
        }

        setInviteData(null);
        setSearchParams({}); // Clear URL
    };

    return (
        <div className="pt-10 px-6 pb-24 min-h-screen flex flex-col">
            <header className="mb-6">
                 <h1 className="text-3xl font-bold text-cozy-900">Collections</h1>
                 <p className="text-cozy-500">Organize your flow.</p>
            </header>

            {/* Tabs */}
            <div className="flex p-1 bg-cozy-100 rounded-2xl mb-8">
                <button 
                    onClick={() => setTab('lists')}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'lists' ? 'bg-white shadow-sm text-cozy-900' : 'text-cozy-500'}`}
                >
                    My Lists
                </button>
                <button 
                    onClick={() => setTab('recipes')}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'recipes' ? 'bg-white shadow-sm text-cozy-900' : 'text-cozy-500'}`}
                >
                    Recipes
                </button>
            </div>
            
            {/* View Toggle - Visible for both tabs */}
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

            {/* Content - Lists */}
            {tab === 'lists' && (
                <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-300">
                     <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                        {lists?.map(list => (
                            <motion.button
                                layout
                                key={list.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setActiveList(list)}
                                className={`rounded-3xl ${list.color || 'bg-cozy-100'} shadow-sm border border-black/5 relative overflow-hidden group transition-all ${viewMode === 'grid' ? 'aspect-square p-6 flex flex-col justify-between text-left' : 'h-20 px-5 flex flex-row items-center gap-4 text-left'}`}
                            >
                                {viewMode === 'grid' ? (
                                    <>
                                        <div className="absolute top-4 right-4 opacity-50">
                                            <ChevronLeft size={24} className="rotate-180 text-cozy-900" />
                                        </div>
                                        <div className="flex-1">
                                            {list.role === 'editor' && (
                                                <Users size={20} className="text-cozy-900 opacity-20" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-cozy-900 leading-tight mb-1">{list.name}</h3>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="shrink-0">
                                            {list.role === 'editor' ? <Users size={20} className="text-cozy-900/50" /> : <div className="w-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-cozy-900 leading-tight truncate">{list.name}</h3>
                                        </div>
                                        <ChevronLeft size={20} className="rotate-180 text-cozy-900/30" />
                                    </>
                                )}
                            </motion.button>
                        ))}
                        
                        {/* Add List Button */}
                        <motion.button
                            layout
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsCreatingList(true)}
                            className={`rounded-3xl border-2 border-dashed border-cozy-200 flex items-center justify-center text-cozy-300 hover:text-cozy-500 hover:border-cozy-300 transition-colors ${viewMode === 'grid' ? 'aspect-square flex-col' : 'h-20 flex-row gap-2'}`}
                        >
                            <Plus size={viewMode === 'grid' ? 32 : 24} />
                            <span className="font-bold text-sm">New List</span>
                        </motion.button>
                     </div>
                </div>
            )}

            {/* Content - Recipes */}
            {tab === 'recipes' && (
                <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                        {recipes?.map(recipe => (
                        <motion.button
                            layout
                            key={recipe.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveRecipe(recipe)}
                            className={`rounded-3xl ${recipe.color || 'bg-cozy-100'} shadow-sm border border-black/5 relative overflow-hidden group transition-all ${viewMode === 'grid' ? 'aspect-square p-6 flex flex-col justify-between text-left' : 'h-20 px-5 flex flex-row items-center gap-4 text-left'}`}
                        >
                            {viewMode === 'grid' ? (
                                <>
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-50 transition-opacity">
                                        <Play size={24} className="text-cozy-900" />
                                    </div>
                                    
                                    <div className="flex-1">
                                        <Zap size={24} className="text-cozy-900 opacity-20" />
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-xl font-bold text-cozy-900 leading-tight mb-1">{recipe.name}</h3>
                                        <p className="text-cozy-900/60 text-xs font-bold uppercase tracking-wider">{recipe.taskTemplates.length} Tasks</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="shrink-0">
                                        <Zap size={20} className="text-cozy-900/50" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-cozy-900 leading-tight truncate">{recipe.name}</h3>
                                        <p className="text-cozy-900/60 text-[10px] font-bold uppercase tracking-wider">{recipe.taskTemplates.length} Tasks</p>
                                    </div>
                                    <Play size={20} className="text-cozy-900/30" />
                                </>
                            )}
                        </motion.button>
                        ))}

                         {/* Add Recipe Button */}
                         <motion.button
                            layout
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsCreatingRecipe(true)}
                            className={`rounded-3xl border-2 border-dashed border-cozy-200 flex items-center justify-center text-cozy-300 hover:text-cozy-500 hover:border-cozy-300 transition-colors ${viewMode === 'grid' ? 'aspect-square flex-col' : 'h-20 flex-row gap-2'}`}
                        >
                            <Plus size={viewMode === 'grid' ? 32 : 24} />
                            <span className="font-bold text-sm">New Recipe</span>
                        </motion.button>
                    </div>
                </div>
            )}
            
            <AnimatePresence>
                {isCreatingList && <CreateListModal onClose={() => setIsCreatingList(false)} />}
                {isCreatingRecipe && <CreateRecipeModal onClose={() => setIsCreatingRecipe(false)} />}
                {activeRecipe && <RunRecipeModal recipe={activeRecipe} onClose={() => setActiveRecipe(null)} />}
                {activeList && <ListDetailView list={activeList} onClose={() => setActiveList(null)} />}
                {inviteData && (
                    <AcceptInviteModal 
                        inviteData={inviteData} 
                        onAccept={handleAcceptInvite} 
                        onCancel={() => { setInviteData(null); setSearchParams({}); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
