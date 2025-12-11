import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Mic, Sparkles, X, StopCircle, Check, Trash2, Mic2, CalendarDays } from 'lucide-react';
import { TaskStatus } from '../types';
import { hapticImpact } from '../services/haptics';
import { processVoiceMemo } from '../services/aiProcessor';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useTasks, useStaging } from '../hooks/useFireStore';

// --- Helper: Date Parsing ---
const parseDateKeywords = (text: string) => {
    const lower = text.toLowerCase();
    const now = new Date();

    // Check for "tomorrow"
    if (/\btomorrow\b/.test(lower)) {
        const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0);
        return { date: d, label: 'Tomorrow', status: TaskStatus.INBOX, cleanText: text.replace(/\btomorrow\b/i, '').trim() };
    }
    // Check for "today"
    if (/\btoday\b/.test(lower)) {
        const d = new Date(now); d.setHours(12, 0, 0, 0);
        return { date: d, label: 'Today', status: TaskStatus.TODAY, cleanText: text.replace(/\btoday\b/i, '').trim() };
    }
    // Check for "tonight"
    if (/\btonight\b/.test(lower)) {
        const d = new Date(now); d.setHours(19, 0, 0, 0); // 7 PM
        return { date: d, label: 'Tonight', status: TaskStatus.TODAY, cleanText: text.replace(/\btonight\b/i, '').trim() };
    }
    // Check for "next week"
    if (/\bnext week\b/.test(lower)) {
        const d = new Date(now); d.setDate(d.getDate() + 7); d.setHours(12, 0, 0, 0);
        return { date: d, label: 'Next Week', status: TaskStatus.INBOX, cleanText: text.replace(/\bnext week\b/i, '').trim() };
    }
    return null;
};

// --- Review Card Component ---
interface ReviewCardProps {
    task: any;
    index: number;
    onSwipe: (dir: 'left' | 'right') => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ task, index, onSwipe }) => {
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

export interface QuickCaptureProps {
    forceOpen?: boolean;
    initialContent?: string;
    onClose?: () => void;
}

export const QuickCapture: React.FC<QuickCaptureProps> = ({ forceOpen, initialContent, onClose }) => {
    const [isListening, setIsListening] = useState(false);
    const [input, setInput] = useState('');

    useEffect(() => {
        if (initialContent) {
            setInput(initialContent);
        }
    }, [initialContent]);

    // Logic to handle forceOpen is tricky with current design as it spawns a different UI for review vs input
    // The current QuickCapture is a bottom bar.
    // If we want "forceOpen", we might want to focus the input or show a modal?
    // Based on ShareHandler design, it seems we want to show it.


    // Hook for Firestore Actions
    const { addTask } = useTasks();
    const { stagingItems, deleteStagingItem } = useStaging();

    const currentStagingItem = stagingItems?.[0];
    const [localTasks, setLocalTasks] = useState<any[]>([]);

    useEffect(() => {
        if (currentStagingItem) {
            setLocalTasks(currentStagingItem.tasks);
            hapticImpact.success();
        } else {
            setLocalTasks([]);
        }
    }, [currentStagingItem]);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const detectedDate = useMemo(() => parseDateKeywords(input), [input]);

    // --- Manual Text Submit ---
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        hapticImpact.success();

        const taskContent = detectedDate ? detectedDate.cleanText : input;
        const taskStatus = detectedDate ? detectedDate.status : TaskStatus.INBOX;
        const taskDueAt = detectedDate ? detectedDate.date.getTime() : undefined;

        // FIRESTORE WRITE
        await addTask({
            content: taskContent,
            status: taskStatus,
            dueAt: taskDueAt,
            source: 'manual' as const,
        });
        if (onClose) onClose();
        setInput('');
    };

    // --- Voice Logic (Unchanged except logic flow) ---
    const toggleListening = async () => {
        if (isListening) {
            stopListening();
        } else {
            await startListening();
        }
    };

    const startListening = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                const mimeType = recorder.mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                stream.getTracks().forEach(t => t.stop());
                const context = currentStagingItem ? localTasks : [];
                processVoiceMemo(audioBlob, context);
                hapticImpact.success();
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsListening(true);
            hapticImpact.medium();
        } catch (error) {
            console.error("Microphone access denied:", error);
            alert("Microphone access required.");
        }
    };

    const stopListening = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsListening(false);
        }
    };

    // --- Review Logic ---
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

        if (newStack.length === 0 && currentStagingItem?.id) {
            await deleteStagingItem(currentStagingItem.id);
        }
    };

    const handleCloseReview = async () => {
        if (currentStagingItem?.id) {
            await deleteStagingItem(currentStagingItem.id);
        }
    };

    // ... (Render Logic remains largely same, just using new handlers)

    if (currentStagingItem) {
        return (
            <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-xl flex flex-col pt-20 pb-8 px-6 animate-in fade-in duration-300">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center p-3 bg-indigo-100 text-indigo-600 rounded-full mb-4">
                        <Sparkles size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-cozy-900 mb-2">{currentStagingItem.summary}</h2>
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
                    {localTasks.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-cozy-400">
                            All done!
                        </div>
                    )}
                </div>

                <div className="mt-8 flex items-center justify-center gap-6">
                    <button onClick={handleCloseReview} className="p-4 rounded-full bg-cozy-100 text-cozy-600 hover:bg-cozy-200 transition-colors">
                        <X size={24} />
                    </button>
                    {/* Refinement UI */}
                    <div className="flex-1 max-w-xs relative group">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!input.trim()) return;
                                const text = input;
                                setInput('');
                                setLocalTasks([]); // Clear to show loading state effectively or just keep old ones?
                                // Actually, better UX might be to show a loading state overlay.
                                // For now, let's just trigger the process.
                                import('../services/aiProcessor').then(({ processTextRefinement }) => {
                                    processTextRefinement(text, localTasks);
                                    hapticImpact.medium();
                                });
                            }}
                            className="relative flex items-center"
                        >
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
    }

    if (isListening) {
        return (
            <div className="fixed inset-0 z-50 bg-indigo-600/90 backdrop-blur-md flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
                <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-8"
                >
                    <Mic size={48} />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Listening...</h2>
                <p className="text-white/70">Tap stop to analyze in background.</p>

                <button onClick={toggleListening} className="mt-12 p-4 bg-white text-indigo-600 rounded-full shadow-lg active:scale-95 transition-transform">
                    <StopCircle size={32} />
                </button>
            </div>
        );
    }

    return (
        <div className={`fixed bottom-24 left-0 right-0 px-4 z-40 transition-all duration-300`}>
            <AnimatePresence>
                {detectedDate && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute -top-10 left-4 bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 z-10"
                    >
                        <CalendarDays size={14} className="text-indigo-200" />
                        {detectedDate.label}
                    </motion.div>
                )}
            </AnimatePresence>

            <form
                onSubmit={handleManualSubmit}
                className="relative flex items-center bg-white shadow-2xl rounded-2xl overflow-hidden border border-cozy-200"
            >
                <button type="button" onClick={toggleListening} className="p-4 text-indigo-600 hover:bg-indigo-50 transition-colors border-r border-cozy-100">
                    <Mic size={20} />
                </button>

                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Quick capture..."
                    autoFocus={!!forceOpen} // Auto focus if forced open
                    className="w-full py-4 px-4 text-lg bg-transparent outline-none placeholder:text-cozy-300 text-cozy-800"
                />

                <div className="absolute right-2">
                    {input ? (
                        <button type="submit" className="p-2 bg-cozy-900 text-white rounded-xl active:scale-90 transition-all shadow-md">
                            <Send size={20} />
                        </button>
                    ) : null}
                </div>
            </form>
        </div>
    );
};