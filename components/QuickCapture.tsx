import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Mic, Sparkles, X, StopCircle, Check, Trash2, Mic2, CalendarDays } from 'lucide-react';
import { TaskStatus } from '../types';
import { hapticImpact } from '../services/haptics';
import { processVoiceMemo } from '../services/aiProcessor';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useTasks } from '../hooks/useFireStore';

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



// --- Minimal Quick Capture Component ---
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

    // Hook for Firestore Actions
    const { addTask } = useTasks();

    // Removed Staging Logic from here - now it's just "Fire and Forget" to the Inbox!

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

    // --- Voice Logic ---
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

                // Fire and forget to AI logic
                processVoiceMemo(audioBlob);
                hapticImpact.success();

                // Show a toast or notification? 
                // For now, minimizing the capture sheet is good feedback.
                if (onClose) onClose();
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
                <p className="text-white/70">Tap stop to analyze in Background.</p>

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
                        className="absolute -top-12 left-6 bg-indigo-600/90 backdrop-blur text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-xl shadow-indigo-500/20 flex items-center gap-2 z-10"
                    >
                        <CalendarDays size={14} className="text-indigo-200" />
                        {detectedDate.label}
                    </motion.div>
                )}
            </AnimatePresence>

            <form
                onSubmit={handleManualSubmit}
                className="relative flex items-center bg-white/80 backdrop-blur-2xl shadow-2xl shadow-cozy-900/10 rounded-[2rem] overflow-hidden border border-white/50 ring-1 ring-cozy-900/5 group transition-all hover:scale-[1.01]"
            >
                <button
                    type="button"
                    onClick={toggleListening}
                    className="p-5 text-indigo-600 hover:bg-indigo-50/50 transition-colors border-r border-cozy-100 flex-shrink-0 relative"
                >
                    <div className="absolute inset-0 bg-indigo-100/30 animate-pulse-slow rounded-full m-2"></div>
                    <Mic size={22} className="relative z-10" />
                </button>

                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Capture thought..."
                    autoFocus={!!forceOpen} // Auto focus if forced open
                    className="w-full py-5 px-4 text-lg bg-transparent outline-none placeholder:text-cozy-400 text-cozy-800 font-medium"
                />

                <div className="absolute right-3">
                    {input ? (
                        <button type="submit" className="p-3 bg-cozy-900 text-white rounded-xl active:scale-90 transition-all shadow-lg hover:shadow-xl">
                            <Send size={20} />
                        </button>
                    ) : null}
                </div>
            </form>
        </div>
    );
};