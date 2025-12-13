
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, CheckCircle2, Clock, Calendar, ArrowRight } from 'lucide-react';
import { useTasks } from '../hooks/useFireStore';
import { Task, TaskStatus } from '../types';
import { TaskDetailModal } from './TaskDetailModal';

export const CommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Fetch ALL tasks (no filter)
    const { tasks } = useTasks({});
    const inputRef = useRef<HTMLInputElement>(null);

    // Toggle with Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Filter tasks
    const filteredTasks = tasks.filter(task => {
        if (!query) return false;
        const lowerQuery = query.toLowerCase();
        return (
            task.content.toLowerCase().includes(lowerQuery) ||
            task.notes?.toLowerCase().includes(lowerQuery)
        );
    }).slice(0, 10); // Limit to 10 results

    // Keyboard navigation
    useEffect(() => {
        const handleNav = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredTasks.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredTasks.length) % filteredTasks.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredTasks[selectedIndex]) {
                    setSelectedTask(filteredTasks[selectedIndex]);
                    setIsOpen(false);
                }
            }
        };

        window.addEventListener('keydown', handleNav);
        return () => window.removeEventListener('keydown', handleNav);
    }, [isOpen, filteredTasks, selectedIndex]);

    const handleSelect = (task: Task) => {
        setSelectedTask(task);
        setIsOpen(false);
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh] px-4"
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh] border border-gray-100"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Search Header */}
                            <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
                                <Search className="text-gray-400" size={20} />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search tasks..."
                                    className="flex-1 bg-transparent outline-none text-lg text-gray-800 placeholder:text-gray-400"
                                    value={query}
                                    onChange={e => {
                                        setQuery(e.target.value);
                                        setSelectedIndex(0);
                                    }}
                                />
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                        ESC
                                    </span>
                                </div>
                            </div>

                            {/* Results */}
                            <div className="overflow-y-auto p-2">
                                {query === '' ? (
                                    <div className="p-8 text-center text-gray-400">
                                        <p className="text-sm">Type to search...</p>
                                    </div>
                                ) : filteredTasks.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">
                                        <p className="text-sm">No tasks found.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        {filteredTasks.map((task, index) => (
                                            <button
                                                key={task.id}
                                                onClick={() => handleSelect(task)}
                                                className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors ${index === selectedIndex ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-gray-50 text-gray-700'
                                                    }`}
                                            >
                                                {task.status === TaskStatus.DONE ? (
                                                    <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                                                ) : (
                                                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${index === selectedIndex ? 'border-indigo-400' : 'border-gray-300'}`} />
                                                )}

                                                <div className="flex-1 overflow-hidden">
                                                    <p className="truncate font-medium text-sm">{task.content}</p>
                                                    {task.listId && <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">In List</p>}
                                                </div>

                                                {index === selectedIndex && (
                                                    <ArrowRight size={14} className="text-indigo-400" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="bg-gray-50 px-4 py-2 text-[10px] text-gray-400 flex justify-between border-t border-gray-100">
                                <span>{filteredTasks.length} results</span>
                                <span className="flex items-center gap-2">
                                    Use <span className="bg-white border border-gray-200 px-1 rounded shadow-sm">↑</span> <span className="bg-white border border-gray-200 px-1 rounded shadow-sm">↓</span> to navigate
                                </span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedTask && (
                    <TaskDetailModal
                        task={selectedTask}
                        onClose={() => setSelectedTask(null)}
                    />
                )}
            </AnimatePresence>
        </>
    );
};
