import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Recipe, TaskStatus } from '../types';
import { hapticImpact } from '../services/haptics';
import { Plus, X, Trash2, Calendar, Check, ArrowRight, Play } from 'lucide-react';
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

// --- Components ---

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
      template: name, // Fallback for the type definition
      taskTemplates: validTasks,
      color
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white animate-in fade-in slide-in-from-bottom-10 duration-200">
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
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Morning Routine"
            className="w-full text-2xl font-bold text-cozy-900 placeholder:text-cozy-300 outline-none border-b-2 border-transparent focus:border-cozy-900 transition-colors pb-2"
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

      {/* Footer */}
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
    
    // Determine Due Date
    let dueAt: number | undefined;
    if (dateOffset !== null) {
        const d = new Date();
        d.setDate(d.getDate() + dateOffset);
        d.setHours(12, 0, 0, 0); // Noon
        dueAt = d.getTime();
    }

    // Process Tasks
    const tasksToAdd = recipe.taskTemplates.map(tmpl => {
      let content = tmpl;
      // Replace variables
      Object.entries(varValues).forEach(([key, val]) => {
          content = content.replace(new RegExp(`{${key}}`, 'g'), String(val));
      });
      return {
        content,
        status: dueAt ? TaskStatus.TODAY : TaskStatus.INBOX, // If dated, goes to today/scheduled, else inbox
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
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
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

export const Recipes = () => {
  const recipes = useLiveQuery(() => db.recipes.toArray());
  const [isCreating, setIsCreating] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);

  return (
    <div className="pt-10 px-6 pb-24 min-h-screen">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-cozy-900">Recipes</h1>
          <p className="text-cozy-500">Automate your routines.</p>
        </div>
        <button 
            onClick={() => setIsCreating(true)}
            className="p-3 bg-cozy-900 text-white rounded-full shadow-lg active:scale-90 transition-transform"
        >
            <Plus size={24} />
        </button>
      </div>

      {recipes && recipes.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {recipes.map(recipe => (
              <motion.button
                key={recipe.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveRecipe(recipe)}
                className={`aspect-square rounded-3xl ${recipe.color || 'bg-cozy-100'} p-6 flex flex-col justify-between text-left shadow-sm border border-black/5 relative overflow-hidden group`}
              >
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-50 transition-opacity">
                      <Play size={24} className="text-cozy-900" />
                  </div>
                  
                  <div className="flex-1"></div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-cozy-900 leading-tight mb-1">{recipe.name}</h3>
                    <p className="text-cozy-900/60 text-xs font-bold uppercase tracking-wider">{recipe.taskTemplates.length} Tasks</p>
                  </div>
              </motion.button>
            ))}
          </div>
      ) : (
          <div className="flex flex-col items-center justify-center py-20 text-cozy-400 text-center">
              <div className="w-16 h-16 bg-cozy-100 rounded-full flex items-center justify-center mb-4">
                  <Play size={32} className="text-cozy-300 ml-1" />
              </div>
              <p>No recipes yet.</p>
              <p className="text-sm mt-1">Tap + to create a routine.</p>
          </div>
      )}

      {/* Modals */}
      <AnimatePresence>
          {isCreating && <CreateRecipeModal onClose={() => setIsCreating(false)} />}
          {activeRecipe && <RunRecipeModal recipe={activeRecipe} onClose={() => setActiveRecipe(null)} />}
      </AnimatePresence>
    </div>
  );
};