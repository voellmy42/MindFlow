import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Recipe, TaskStatus } from '../types';
import { hapticImpact } from '../services/haptics';
import { Play, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const RecipeCard: React.FC<{ recipe: Recipe; onRun: (r: Recipe) => void }> = ({ recipe, onRun }) => {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onRun(recipe)}
      className={`w-full p-6 rounded-3xl ${recipe.color || 'bg-white'} text-left shadow-sm border border-black/5 relative overflow-hidden group`}
    >
      <div className="relative z-10">
        <h3 className="text-xl font-bold text-cozy-900 mb-1">{recipe.name}</h3>
        <p className="text-cozy-700 opacity-80 text-sm line-clamp-2">{recipe.template}</p>
      </div>
      <div className="absolute right-4 bottom-4 w-10 h-10 bg-white/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Play size={16} className="text-cozy-900 ml-1" />
      </div>
    </motion.button>
  );
};

const MadLibsRunner = ({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) => {
  // Extract variables {varName}
  const variableRegex = /{([^}]+)}/g;
  const variables = [...new Set((recipe.template.match(variableRegex) || []).map(s => s.slice(1, -1)))];
  
  const [values, setValues] = useState<Record<string, string>>({});

  const handleGenerate = async () => {
    hapticImpact.success();
    
    // Replace logic
    const tasksToAdd = recipe.taskTemplates.map(tmpl => {
      let content = tmpl;
      variables.forEach(v => {
        content = content.replace(new RegExp(`{${v}}`, 'g'), values[v] || '...');
      });
      return {
        content,
        status: TaskStatus.INBOX,
        createdAt: Date.now(),
        source: 'recipe'
      };
    });

    await db.tasks.bulkAdd(tasksToAdd as any);
    onClose();
  };

  // Split template by variables to create the inline form
  const renderTemplateInput = () => {
    const parts = recipe.template.split(variableRegex);
    // This simple split puts variables at odd indices
    return (
      <div className="text-2xl font-bold leading-relaxed text-cozy-800">
        {parts.map((part, i) => {
          if (variables.includes(part)) {
             return (
               <input
                 key={i}
                 autoFocus={i === 1} // Focus first input
                 type={part === 'days' || part === 'number' ? 'number' : 'text'}
                 placeholder={part}
                 className="inline-block mx-1 border-b-2 border-cozy-300 focus:border-cozy-900 bg-transparent outline-none text-indigo-600 w-32 placeholder:text-cozy-300 text-center"
                 value={values[part] || ''}
                 onChange={(e) => setValues(prev => ({ ...prev, [part]: e.target.value }))}
               />
             );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-50 flex flex-col p-6 animate-in fade-in slide-in-from-bottom-10 duration-200">
        <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-cozy-400 font-medium uppercase tracking-wider text-sm mb-8 text-center">Run Recipe</h2>
            {renderTemplateInput()}
        </div>
        
        <button
            onClick={handleGenerate}
            disabled={Object.keys(values).length !== variables.length}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
        >
            Generate Tasks
        </button>
        <button onClick={onClose} className="mt-4 py-4 text-cozy-500 font-medium">Cancel</button>
    </div>
  );
};

export const Recipes = () => {
  const recipes = useLiveQuery(() => db.recipes.toArray());
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);

  return (
    <div className="pt-10 px-6 pb-24 min-h-screen">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-cozy-900">Recipes</h1>
          <p className="text-cozy-500">Automate your routines.</p>
        </div>
        <button className="p-3 bg-cozy-900 text-white rounded-full shadow-lg">
            <Plus size={20} />
        </button>
      </div>

      <div className="grid gap-4">
        {recipes?.map(recipe => (
          <RecipeCard key={recipe.id} recipe={recipe} onRun={setActiveRecipe} />
        ))}
      </div>

      {activeRecipe && (
        <MadLibsRunner recipe={activeRecipe} onClose={() => setActiveRecipe(null)} />
      )}
    </div>
  );
};