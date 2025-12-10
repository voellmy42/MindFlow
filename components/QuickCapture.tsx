import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic } from 'lucide-react';
import { db } from '../db';
import { TaskStatus } from '../types';
import { hapticImpact } from '../services/haptics';

export const QuickCapture = () => {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    hapticImpact.success();
    await db.tasks.add({
      content: input,
      status: TaskStatus.INBOX,
      createdAt: Date.now(),
      source: 'manual',
    });
    setInput('');
  };

  // PWA Share Target Handler
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('title');
    const text = params.get('text');
    const url = params.get('url');

    if (title || text || url) {
      const content = [title, text, url].filter(Boolean).join(' ');
      setInput(content);
      // Clean URL
      window.history.replaceState({}, '', '/');
      inputRef.current?.focus();
    }
  }, []);

  return (
    <div 
      className={`fixed left-0 right-0 transition-all duration-300 ease-spring ${
        isFocused ? 'bottom-0 bg-white h-screen z-40 pt-20 px-6' : 'bottom-24 px-4 z-40'
      }`}
    >
      <form 
        onSubmit={handleSubmit}
        className={`relative flex items-center bg-white shadow-xl rounded-2xl border border-cozy-200 overflow-hidden transition-all ${
           isFocused ? 'shadow-none border-none ring-2 ring-cozy-900' : ''
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
              if(!input) setIsFocused(false)
          }}
          placeholder="Dump your brain..."
          className="w-full py-4 pl-4 pr-12 text-lg bg-transparent outline-none placeholder:text-cozy-300 text-cozy-800"
        />
        <div className="absolute right-2 flex space-x-2">
            {input ? (
                <button
                type="submit"
                className="p-2 bg-cozy-900 text-white rounded-xl active:scale-90 transition-transform"
                >
                <Send size={20} />
                </button>
            ) : (
                <button
                type="button"
                className="p-2 text-cozy-400 hover:text-cozy-600 transition-colors"
                >
                <Mic size={20} />
                </button>
            )}
        </div>
      </form>
      
      {isFocused && (
        <div className="mt-8">
            <h3 className="text-cozy-400 text-sm font-medium uppercase tracking-wider mb-4">Suggested Recipes</h3>
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                <div className="px-4 py-2 bg-rose-100 text-rose-800 rounded-full text-sm font-medium whitespace-nowrap">
                    Trip to [Place]
                </div>
                 <div className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium whitespace-nowrap">
                    Weekly Review
                </div>
            </div>
            
            <button 
                onClick={() => {
                    setInput('');
                    setIsFocused(false);
                }}
                className="mt-8 w-full py-4 text-cozy-400 font-medium"
            >
                Cancel
            </button>
        </div>
      )}
    </div>
  );
};
