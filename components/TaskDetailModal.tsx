

import React, { useState, useEffect, useRef } from 'react';
import { useLists, useTasks } from '../hooks/useFireStore'; // IMPORT FIRESTORE
import { useDebounce } from '../hooks/useDebounce';
import { Task, RecurrenceRule, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, List as ListIcon, User as UserIcon, AlignLeft, Save, ChevronLeft, ChevronRight, Slash, RotateCcw } from 'lucide-react';
import { hapticImpact } from '../services/haptics';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

// --- Calendar Picker Component (Unchanged) ---
const CalendarPicker = ({ selectedDate, onSelect, onClose }: { selectedDate: Date | null, onSelect: (d: Date | null) => void, onClose: () => void }) => {
    const [viewDate, setViewDate] = useState(selectedDate || new Date());

    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

    const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

    const handleDateClick = (day: number) => {
        hapticImpact.light();
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        newDate.setHours(12, 0, 0, 0);
        onSelect(newDate);
        onClose();
    };

    const handleQuickSelect = (type: 'today' | 'tomorrow' | 'nextWeek' | 'none') => {
        hapticImpact.medium();
        const now = new Date();
        let target: Date | null = new Date();

        switch (type) {
            case 'today': break;
            case 'tomorrow': target.setDate(now.getDate() + 1); break;
            case 'nextWeek': target.setDate(now.getDate() + 7); break;
            case 'none': target = null; break;
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

            <div className="flex gap-2 px-6 pb-6 overflow-x-auto no-scrollbar">
                <button onClick={() => handleQuickSelect('today')} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-semibold whitespace-nowrap">Today</button>
                <button onClick={() => handleQuickSelect('tomorrow')} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-semibold whitespace-nowrap">Tomorrow</button>
                <button onClick={() => handleQuickSelect('nextWeek')} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-semibold whitespace-nowrap">Next Week</button>
                <button onClick={() => handleQuickSelect('none')} className="px-4 py-2 bg-cozy-100 text-cozy-600 rounded-full text-sm font-semibold whitespace-nowrap flex items-center gap-1"><Slash size={12} /> No Date</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-cozy-50 rounded-full"><ChevronLeft className="text-cozy-400" /></button>
                    <span className="text-lg font-bold text-cozy-800">
                        {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-cozy-50 rounded-full"><ChevronRight className="text-cozy-400" /></button>
                </div>
                <div className="grid grid-cols-7 gap-y-4 mb-4 text-center">
                    {weekDays.map(d => (
                        <div key={d} className="text-xs font-bold text-cozy-300">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-y-2 place-items-center">
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const currentDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                        const isSelected = selectedDate && currentDate.getDate() === selectedDate.getDate() && currentDate.getMonth() === selectedDate.getMonth();
                        const isToday = new Date().toDateString() === currentDate.toDateString();
                        return (
                            <button
                                key={day}
                                onClick={() => handleDateClick(day)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                                ${isSelected ? 'bg-cozy-900 text-white shadow-lg shadow-cozy-200 scale-110' : isToday ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-cozy-700 hover:bg-cozy-50'}
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
export const TaskDetailModal: React.FC<{ task: Task; onClose: () => void }> = ({ task, onClose }) => {
    const [content, setContent] = useState(task.content);
    const [dueAt, setDueAt] = useState<Date | null>(task.dueAt ? new Date(task.dueAt) : null);
    const [notes, setNotes] = useState(task.notes || '');
    const [listId, setListId] = useState(task.listId);
    const [recurrence, setRecurrence] = useState<RecurrenceRule | undefined>(task.recurrence);
    const [showRecurrence, setShowRecurrence] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);

    // Assignment State
    const [assigneeEmail, setAssigneeEmail] = useState(task.assigneeEmail || '');
    const [assigneeAvatar, setAssigneeAvatar] = useState(task.assigneeAvatar || '');
    const [responsible, setResponsible] = useState(task.responsible || ''); // Display name

    // Autocomplete State
    const [userQuery, setUserQuery] = useState('');
    const [userResults, setUserResults] = useState<User[]>([]);
    const [showUserResults, setShowUserResults] = useState(false);

    // Use Firestore Hooks
    const { lists } = useLists();
    const { updateTask } = useTasks();

    const debouncedContent = useDebounce(content, 500);
    const debouncedNotes = useDebounce(notes, 500);
    const debouncedUserQuery = useDebounce(userQuery, 300);

    // Initial load for responsible name if not editing
    useEffect(() => {
        if (!userQuery && task.responsible) {
            // Just keeping state in sync
        }
    }, [task.responsible]);

    // Search Users Effect
    useEffect(() => {
        const searchUsers = async () => {
            if (!debouncedUserQuery || debouncedUserQuery.length < 2) {
                setUserResults([]);
                return;
            }

            try {
                // Search by email prefix
                // Note: Firestore doesn't do substring search easily.
                // We use >= query and <= query + \uf8ff for prefix matching
                const q = query(
                    collection(db, 'users'),
                    where('email', '>=', debouncedUserQuery.toLowerCase()),
                    where('email', '<=', debouncedUserQuery.toLowerCase() + '\uf8ff'),
                    limit(5)
                );

                const snapshot = await getDocs(q);
                const users: User[] = [];
                snapshot.forEach(doc => users.push(doc.data() as User));

                setUserResults(users);
                setShowUserResults(users.length > 0);
            } catch (error) {
                console.error("Error searching users", error);
            }
        };

        searchUsers();
    }, [debouncedUserQuery]);

    // Auto-save Effect
    useEffect(() => {
        if (!task.id) return;

        const hasChanges =
            debouncedContent !== task.content ||
            (dueAt ? dueAt.getTime() : undefined) !== task.dueAt ||
            responsible !== (task.responsible || '') ||
            assigneeEmail !== (task.assigneeEmail || '') ||
            assigneeAvatar !== (task.assigneeAvatar || '') ||
            debouncedNotes !== (task.notes || '') ||
            listId !== task.listId ||
            JSON.stringify(recurrence) !== JSON.stringify(task.recurrence);

        if (hasChanges) {
            updateTask(String(task.id), {
                content: debouncedContent,
                dueAt: dueAt ? dueAt.getTime() : null,
                responsible: responsible,
                assigneeEmail: assigneeEmail,
                assigneeAvatar: assigneeAvatar,
                notes: debouncedNotes,
                listId,
                recurrence
            });
        }
    }, [debouncedContent, debouncedNotes, responsible, assigneeEmail, assigneeAvatar, dueAt, listId, recurrence, task, updateTask]);

    const handleRecurrenceSelect = (type: 'none' | 'daily' | 'weekly' | 'monthly') => {
        if (type === 'none') setRecurrence(undefined);
        if (type === 'daily') setRecurrence({ interval: 1, unit: 'days' });
        if (type === 'weekly') setRecurrence({ interval: 1, unit: 'weeks' });
        if (type === 'monthly') setRecurrence({ interval: 1, unit: 'months' });
        setShowRecurrence(false);
    }

    const handleUserSelect = (user: User) => {
        setResponsible(user.name);
        setAssigneeEmail(user.email);
        setAssigneeAvatar(user.avatar || '');
        setUserQuery('');
        setShowUserResults(false);
        hapticImpact.light();
    };

    const handleClearAssignment = () => {
        setResponsible('');
        setAssigneeEmail('');
        setAssigneeAvatar('');
        setUserQuery('');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" />

            <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl pointer-events-auto flex flex-col h-[85vh] relative z-10 overflow-hidden"
            >
                <div className="w-full flex justify-center pt-3 pb-1 shrink-0" onClick={onClose}><div className="w-12 h-1.5 bg-cozy-200 rounded-full" /></div>
                <div className="px-5 pb-2 flex justify-end shrink-0">
                    <button onClick={onClose} className="p-2 -mr-2 text-cozy-400 bg-cozy-50 rounded-full hover:bg-cozy-100 hover:text-cozy-800 transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-6">
                    <textarea
                        value={content} onChange={(e) => setContent(e.target.value)}
                        className="w-full text-2xl font-bold text-cozy-900 bg-transparent border-none outline-none resize-none p-0 mb-6 leading-tight placeholder:text-cozy-200"
                        rows={2} placeholder="What needs to be done?"
                    />
                    <div className="space-y-3">
                        {/* Due Date */}
                        <div onClick={() => setShowCalendar(true)} className="relative group flex items-center gap-3 p-3 bg-cozy-50 rounded-xl border border-transparent active:scale-[0.98] transition-all cursor-pointer">
                            <div className="p-2 bg-white shadow-sm text-indigo-600 rounded-lg"><CalendarIcon size={20} /></div>
                            <div className="flex-1">
                                <div className="text-[10px] font-bold text-cozy-400 uppercase tracking-wide mb-0.5">Due Date</div>
                                <div className="text-base font-medium text-cozy-900">{dueAt ? dueAt.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' }) : <span className="text-cozy-400">Set a date...</span>}</div>
                            </div>
                        </div>

                        {/* Recurrence Selector */}
                        <div className="relative">
                            <div onClick={() => setShowRecurrence(!showRecurrence)} className="flex items-center gap-3 p-3 bg-cozy-50 rounded-xl border border-transparent active:scale-[0.98] transition-all cursor-pointer">
                                <div className="p-2 bg-white shadow-sm text-emerald-600 rounded-lg"><RotateCcw size={20} /></div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-bold text-cozy-400 uppercase tracking-wide mb-0.5">Repeat</div>
                                    <div className="text-base font-medium text-cozy-900">
                                        {recurrence ? `Every ${recurrence.interval} ${recurrence.unit}` : <span className="text-cozy-400">Does not repeat</span>}
                                    </div>
                                </div>
                            </div>
                            <AnimatePresence>
                                {showRecurrence && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl z-30 p-2 border border-cozy-100 flex flex-col gap-1">
                                        <button onClick={() => handleRecurrenceSelect('none')} className="p-2 text-left hover:bg-cozy-50 rounded-lg text-sm font-medium text-cozy-600">Does not repeat</button>
                                        <button onClick={() => handleRecurrenceSelect('daily')} className="p-2 text-left hover:bg-cozy-50 rounded-lg text-sm font-medium text-cozy-900">Daily</button>
                                        <button onClick={() => handleRecurrenceSelect('weekly')} className="p-2 text-left hover:bg-cozy-50 rounded-lg text-sm font-medium text-cozy-900">Weekly</button>
                                        <button onClick={() => handleRecurrenceSelect('monthly')} className="p-2 text-left hover:bg-cozy-50 rounded-lg text-sm font-medium text-cozy-900">Monthly</button>

                                        <div className="border-t border-cozy-100 my-1 pt-2 px-2 pb-1">
                                            <p className="text-[10px] font-bold text-cozy-400 uppercase mb-2">Custom</p>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={recurrence?.interval || 1}
                                                    onChange={(e) => setRecurrence({ interval: parseInt(e.target.value) || 1, unit: recurrence?.unit || 'days' })}
                                                    className="w-14 bg-cozy-50 rounded-md px-2 py-1 text-center text-sm font-bold text-cozy-900 outline-none focus:ring-2 focus:ring-cozy-200"
                                                />
                                                <select
                                                    value={recurrence?.unit || 'days'}
                                                    onChange={(e) => setRecurrence({ interval: recurrence?.interval || 1, unit: e.target.value as any })}
                                                    className="flex-1 bg-cozy-50 rounded-md px-2 py-1 text-sm font-bold text-cozy-900 outline-none focus:ring-2 focus:ring-cozy-200"
                                                >
                                                    <option value="days">Days</option>
                                                    <option value="weeks">Weeks</option>
                                                    <option value="months">Months</option>
                                                    <option value="years">Years</option>
                                                </select>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>


                        {/* List Selector */}
                        <div className="flex items-start gap-3 p-3 bg-cozy-50 rounded-xl border border-transparent transition-all">
                            <div className="p-2 bg-white shadow-sm text-sky-600 rounded-lg mt-0.5"><ListIcon size={20} /></div>
                            <div className="flex-1">
                                <div className="text-[10px] font-bold text-cozy-400 uppercase tracking-wide mb-2">List</div>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => setListId(undefined)} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${listId === undefined ? 'bg-cozy-800 text-white shadow-md' : 'bg-white text-cozy-500 hover:bg-cozy-100'}`}>Inbox</button>
                                    {lists?.map(list => (
                                        <button key={list.id} onClick={() => setListId(list.id)} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${listId === list.id ? `${list.color} text-cozy-900 ring-2 ring-cozy-900 ring-offset-1` : `${list.color} text-cozy-800 opacity-60 hover:opacity-100`}`}>{list.name}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Assigned To - Updated for Autocomplete */}
                        <div className="relative z-20">
                            <div className="flex items-center gap-3 p-3 bg-cozy-50 rounded-xl border border-transparent focus-within:border-rose-200 focus-within:bg-rose-50/30 transition-all">
                                <div className="shrink-0 p-2 bg-white shadow-sm text-rose-600 rounded-lg overflow-hidden">
                                    {assigneeAvatar ? (
                                        <img src={assigneeAvatar} alt="Assignee" className="w-5 h-5 rounded-full object-cover" />
                                    ) : (
                                        <UserIcon size={20} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold text-cozy-400 uppercase tracking-wide mb-0.5">Assigned To</div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={responsible || userQuery}
                                            onChange={(e) => {
                                                if (responsible) {
                                                    // If editing existing, clear assignment and start search
                                                    handleClearAssignment();
                                                    setUserQuery(e.target.value);
                                                } else {
                                                    setUserQuery(e.target.value);
                                                }
                                            }}
                                            onFocus={() => {
                                                if (responsible) {
                                                    // Don't modify if already assigned, user must clear explicitly or type to replace (handled in logic above essentially)
                                                }
                                            }}
                                            placeholder="Assign by email..."
                                            className="w-full bg-transparent text-base font-medium text-cozy-900 outline-none placeholder:text-cozy-400"
                                        />
                                        {responsible && (
                                            <button onClick={handleClearAssignment} className="p-1 rounded-full hover:bg-black/5 text-cozy-400"><X size={14} /></button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <AnimatePresence>
                                {showUserResults && userResults.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl z-30 p-1 border border-cozy-100 max-h-[200px] overflow-y-auto"
                                    >
                                        {userResults.map(user => (
                                            <button
                                                key={user.id}
                                                onClick={() => handleUserSelect(user)}
                                                className="w-full flex items-center gap-3 p-2 hover:bg-cozy-50 rounded-lg transition-colors text-left"
                                            >
                                                <img src={user.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.id}`} alt="" className="w-8 h-8 rounded-full bg-cozy-100" />
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="text-sm font-bold text-cozy-900 truncate">{user.name}</div>
                                                    <div className="text-xs text-cozy-500 truncate">{user.email}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Notes */}
                        <div className="p-3 bg-cozy-50 rounded-xl border border-transparent focus-within:border-amber-200 focus-within:bg-amber-50/30 transition-all flex flex-col gap-2 min-h-[140px]">
                            <div className="flex items-center gap-2"><div className="p-1.5 bg-white shadow-sm text-amber-600 rounded-md"><AlignLeft size={16} /></div><div className="text-[10px] font-bold text-cozy-400 uppercase tracking-wide">Notes</div></div>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add details..." className="w-full flex-1 bg-transparent text-base text-cozy-800 outline-none placeholder:text-cozy-400 resize-none leading-relaxed" />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-cozy-100 bg-white/90 backdrop-blur-md pb-8 sm:pb-6 rounded-b-[2rem] shrink-0 z-20 sticky bottom-0">
                    <p className="text-center text-xs text-cozy-400 font-medium">Changes specified here are saved automatically.</p>
                </div>

                <AnimatePresence>{showCalendar && (<CalendarPicker selectedDate={dueAt} onSelect={setDueAt} onClose={() => setShowCalendar(false)} />)}</AnimatePresence>
            </motion.div>
        </div>
    );
};