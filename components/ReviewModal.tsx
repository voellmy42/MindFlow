import React, { useState, useEffect } from 'react';
import { Send, Sparkles, X, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { hapticImpact } from '../services/haptics';
import { useTasks, useStaging } from '../hooks/useFireStore';
import { processTextRefinement } from '../services/aiProcessor';
import { TaskStatus } from '../types';

// Use same card logic
const ReviewCard = ({ task, index, onSwipe }: { task: any, index: number, onSwipe: (dir: 'left' | 'right') => void }) => {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-150, 0, 150], [-15, 0, 15]);
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

    const rightOpacity = useTransform(x, [0, 100], [0, 1]);
    const leftOpacity = useTransform(x, [0, -100], [0, 1]);

    const handleDragEnd = (event: any, info: PanInfo) => {
        if (info.offset.x > 100) onSwipe('right');
        else if (info.offset.x < -100) onSwipe('left');
    };

    return (
        <motion.div
            style={{ x, rotate, opacity, zIndex: 100 - index }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            initial={{ scale: 0.9, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="absolute top-0 left-0 right-0 h-80 bg-white rounded-3xl shadow-2xl border border-cozy-100 flex flex-col items-center justify-center p-6 select-none cursor-grab active:cursor-grabbing overflow-hidden"
        >
            <motion.div style={{ opacity: rightOpacity }} className="absolute inset-0 bg-green-500/10 flex items-center justify-start pl-6 pointer-events-none">
                <Check size={48} className="text-green-600" />
            </motion.div>
            <motion.div style={{ opacity: leftOpacity }} className="absolute inset-0 bg-red-500/10 flex items-center justify-end pr-6 pointer-events-none">
                <Trash2 size={48} className="text-red-600" />
            </motion.div>

            <h3 className="text-2xl font-bold text-cozy-900 text-center leading-tight mb-2">{task.content}</h3>
            {task.dueAt && (
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">
                    {new Date(task.dueAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
            )}
            {task.notes && (
                <p className="mt-4 text-sm text-cozy-500 text-center line-clamp-3">{task.notes}</p>
            )}
        </motion.div>
    );
};

export const ReviewModal = ({ item, onClose }: { item: any, onClose: () => void }) => {
    const { addTask } = useTasks();
    const { deleteStagingItem } = useStaging();
    const [localTasks, setLocalTasks] = useState<any[]>([]);
    const [input, setInput] = useState('');

    useEffect(() => {
        if (item) {
            setLocalTasks(item.tasks);
        }
    }, [item]);

    const handleSwipe = async (direction: 'left' | 'right') => {
        if (localTasks.length === 0) return;
        const currentTask = localTasks[0];

        if (direction === 'right') {
            hapticImpact.success();
            // FIRESTORE WRITE
            await addTask({
                content: currentTask.content,
                status: currentTask.dueAt ? TaskStatus.TODAY : TaskStatus.INBOX,
                dueAt: currentTask.dueAt,
                responsible: currentTask.responsible,
                notes: currentTask.notes,
                source: 'voice' as const
            });
        } else {
            hapticImpact.light();
        }

        const newStack = localTasks.slice(1);
        setLocalTasks(newStack);

        if (newStack.length === 0) {
            await deleteStagingItem(item.id);
            onClose();
        }
    };

    const handleRefine = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Trigger refinement
        // This will update the staging item in background.
        // We should show some feedback or simply close the modal and let the user see "Processing" in Inbox again?
        // Or keep modal open with loading state?
        // Let's close modal and let Inbox show "Refining...".
        hapticImpact.medium();
        await processTextRefinement(input, localTasks, item.id);
        onClose(); // Close to return to inbox to see status update
    };

    return (
        <div className="fixed inset-0 z-[150] bg-white/95 backdrop-blur-xl flex flex-col pt-20 pb-8 px-6 animate-in fade-in duration-300">
            <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center p-3 bg-indigo-100 text-indigo-600 rounded-full mb-4">
                    <Sparkles size={24} />
                </div>
                <h2 className="text-xl font-bold text-cozy-900 mb-2">{item.summary}</h2>
                {localTasks.length > 0 && (
                    <p className="text-cozy-500 text-sm">Swipe <b>Right</b> to keep, <b>Left</b> to discard.</p>
                )}
            </div>

            <div className="flex-1 relative w-full max-w-sm mx-auto min-h-[350px]">
                <AnimatePresence>
                    {localTasks.map((task, index) => (
                        <ReviewCard
                            key={task.id || index}
                            task={task}
                            index={index}
                            onSwipe={handleSwipe}
                        />
                    )).reverse()}
                </AnimatePresence>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6">
                <button onClick={onClose} className="p-4 rounded-full bg-cozy-100 text-cozy-600 hover:bg-cozy-200 transition-colors">
                    <X size={24} />
                </button>
                {/* Refinement UI */}
                <div className="flex-1 max-w-xs relative group">
                    <form onSubmit={handleRefine} className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Refine... e.g. 'Make it due tomorrow'"
                            className="w-full py-3 px-4 pr-10 rounded-2xl bg-cozy-50 border border-cozy-200 focus:border-indigo-500 outline-none text-sm transition-all"
                        />
                        <button type="submit" disabled={!input.trim()} className="absolute right-2 p-1.5 text-indigo-600 disabled:opacity-30 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
