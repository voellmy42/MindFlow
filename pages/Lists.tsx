
import React, { useState } from 'react';
import { useLists, useTasks } from '../hooks/useFireStore'; // Updated hook
import { TaskStatus } from '../types';
import { hapticImpact } from '../services/haptics';
import { playSynthSound } from '../services/sounds';
import { Plus, X, Trash2, ChevronLeft, Circle, Send, Share2, Users, CheckSquare, LayoutGrid, StretchHorizontal, SquareLibrary, BookOpen, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Recipes } from './Recipes';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { Task } from '../types';

const COLORS = [
    'bg-rose-200', 'bg-orange-200', 'bg-amber-200',
    'bg-green-200', 'bg-emerald-200', 'bg-teal-200',
    'bg-cyan-200', 'bg-sky-200', 'bg-blue-200',
    'bg-indigo-200', 'bg-violet-200', 'bg-purple-200',
    'bg-fuchsia-200', 'bg-pink-200', 'bg-slate-200'
];

const CreateListModal = ({ onClose }: { onClose: () => void }) => {
    const [step, setStep] = useState<'select' | 'create' | 'join'>('select');
    const [name, setName] = useState('');
    const [color, setColor] = useState(COLORS[0]);

    const [inviteLink, setInviteLink] = useState('');
    const [joinError, setJoinError] = useState<string | null>(null);

    const { addList, joinList } = useLists();

    const handleCreate = async () => {
        if (!name.trim()) return;
        hapticImpact.success();
        await addList({ name, color });
        onClose();
    };

    const handleJoin = async () => {
        if (!inviteLink.trim()) return;

        const match = inviteLink.match(/\/join\/([a-zA-Z0-9-]+)/);
        if (!match) {
            setJoinError("Invalid link format. Must contain /join/{id}");
            hapticImpact.error();
            return;
        }

        const sharedId = match[1];
        try {
            setJoinError(null);
            const result = await joinList(sharedId);
            hapticImpact.success();
            onClose();
        } catch (err: any) {
            console.error(err);
            setJoinError(err.message || "Failed to join list.");
            hapticImpact.error();
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex flex-col bg-white animate-in fade-in slide-in-from-bottom-10 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-cozy-100">
                <div className="flex items-center gap-3">
                    {step !== 'select' && (
                        <button onClick={() => { setStep('select'); hapticImpact.light(); }} className="p-2 -ml-2 rounded-full hover:bg-cozy-50 text-cozy-600">
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    <h2 className="text-xl font-bold text-cozy-900">
                        {step === 'select' && 'Add List'}
                        {step === 'create' && 'New List'}
                        {step === 'join' && 'Join List'}
                    </h2>
                </div>
                <button onClick={onClose} className="p-2 bg-cozy-50 rounded-full text-cozy-600">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 p-6">
                {step === 'select' && (
                    <div className="grid grid-cols-1 gap-4">
                        <button
                            onClick={() => { setStep('create'); hapticImpact.light(); }}
                            className="p-6 bg-cozy-50 rounded-3xl text-left border-2 border-transparent hover:border-cozy-200 transition-all active:scale-[0.98]"
                        >
                            <div className="w-12 h-12 bg-cozy-900 rounded-full flex items-center justify-center text-white mb-4 shadow-md">
                                <Plus size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-cozy-900">Create New List</h3>
                            <p className="text-cozy-500 mt-1">Start a fresh list for your tasks.</p>
                        </button>

                        <button
                            onClick={() => { setStep('join'); hapticImpact.light(); }}
                            className="p-6 bg-cozy-50 rounded-3xl text-left border-2 border-transparent hover:border-cozy-200 transition-all active:scale-[0.98]"
                        >
                            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white mb-4 shadow-md">
                                <Users size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-cozy-900">Join Existing List</h3>
                            <p className="text-cozy-500 mt-1">Paste an invite link to collaborate.</p>
                        </button>
                    </div>
                )}

                {step === 'create' && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-300">
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
                )}

                {step === 'join' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
                        <div className="bg-cozy-50 p-4 rounded-2xl">
                            <label className="block text-xs font-bold uppercase text-cozy-500 mb-2">Invite Link</label>
                            <input
                                autoFocus
                                type="text"
                                value={inviteLink}
                                onChange={e => { setInviteLink(e.target.value); setJoinError(null); }}
                                placeholder="Paste link here..."
                                className="w-full text-lg bg-transparent outline-none text-cozy-900"
                            />
                        </div>
                        {joinError && (
                            <div className="text-red-500 font-medium text-sm flex items-center gap-2">
                                <AlertCircle size={16} />
                                {joinError}
                            </div>
                        )}
                        <p className="text-cozy-400 text-sm">
                            Paste the link shared with you to collaborate on a list.
                        </p>
                    </div>
                )}
            </div>

            {step !== 'select' && (
                <div className="p-6 border-t border-cozy-100 bg-cozy-50 pb-safe">
                    <button
                        onClick={step === 'create' ? handleCreate : handleJoin}
                        className="w-full py-4 bg-cozy-900 text-white rounded-2xl font-bold text-lg shadow-lg"
                    >
                        {step === 'create' ? 'Create List' : 'Join List'}
                    </button>
                </div>
            )}
        </div>
    );
};

const ShareListModal = ({ list, onClose }: { list: any, onClose: () => void }) => {
    const [copied, setCopied] = useState(false);
    const shareUrl = `${window.location.origin}/join/${list.sharedId || list.id}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        hapticImpact.success();
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-cozy-900">Share "{list.name}"</h3>
                    <button onClick={onClose} className="p-2 bg-cozy-50 rounded-full text-cozy-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 bg-cozy-50 rounded-2xl mb-4 border border-cozy-100 flex items-center justify-center py-8">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${list.color}`}>
                        <Share2 size={32} />
                    </div>
                </div>

                <p className="text-center text-cozy-600 font-medium mb-6">
                    Invite others to collaborate on <br /> <span className="text-cozy-900 font-bold">"{list.name}"</span>
                </p>

                <button
                    onClick={handleCopy}
                    className="w-full py-4 bg-cozy-900 text-white rounded-2xl font-bold text-lg shadow-md flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    {copied ? <CheckSquare size={20} /> : <Share2 size={20} />}
                    {copied ? 'Copied Link!' : 'Copy Invite Link'}
                </button>
            </div>
        </div>
    );
}

const ListDetailView = ({ list, onClose, onDelete, onShare }: { list: any, onClose: () => void, onDelete: () => void, onShare: () => void }) => {
    const [input, setInput] = useState('');
    const [editingTask, setEditingTask] = useState<Task | null>(null);
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

    const toggleTask = async (taskId: string) => {
        console.log("Toggling task:", taskId);
        hapticImpact.light();
        playSynthSound('success');
        try {
            await updateTask(taskId, { status: TaskStatus.DONE });
            console.log("Task toggled successfully");
        } catch (e) {
            console.error("Task toggle failed:", e);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-cozy-50 flex flex-col h-[100dvh] animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className={`shrink-0 ${list.color} px-6 pt-6 pb-6`}>
                <div className="flex justify-between items-center">
                    <button onClick={onClose} className="p-3 rounded-full hover:bg-black/5 text-cozy-900 transition-colors">
                        <ChevronLeft size={28} />
                    </button>
                    <div className="flex gap-2">
                        <button onClick={onShare} className="p-3 rounded-full hover:bg-black/5 text-cozy-900 transition-colors">
                            <Share2 size={24} />
                        </button>
                        {list.role === 'owner' && (
                            <button onClick={onDelete} className="p-3 rounded-full hover:bg-red-500/20 hover:text-red-900 text-cozy-900 transition-colors">
                                <Trash2 size={24} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <h1 className="text-4xl font-extrabold text-cozy-900 leading-tight px-6 pt-2">{list.name}</h1>

            <p className="text-cozy-900/60 font-bold text-sm mt-1 uppercase tracking-wide opacity-80">
                {displayTasks.length} Items
            </p>
            {/* Header End */}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 pb-32">
                <div className="space-y-3">
                    {displayTasks.map((task: any) => (
                        <div key={task.id} className="bg-white rounded-2xl shadow-sm border border-cozy-100 flex items-center gap-3 p-4 group active:scale-[0.99] transition-all">
                            <button onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }} className="p-2 -m-2 text-cozy-300 hover:text-green-500 shrink-0">
                                <Circle size={24} strokeWidth={1.5} />
                            </button>
                            <div className="flex-1 min-w-0" onClick={() => setEditingTask(task)}>
                                <span className="text-lg text-cozy-800 break-words block font-medium leading-tight">{task.content}</span>
                            </div>
                        </div>
                    ))}
                </div>
                {displayTasks.length === 0 && (
                    <div className="text-center text-cozy-400 py-10">
                        <CheckSquare size={48} className="mx-auto mb-2 opacity-50" />
                        <p>List is empty</p>
                    </div>
                )}
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
            <AnimatePresence>
                {editingTask && <TaskDetailModal task={editingTask} onClose={() => setEditingTask(null)} />}
            </AnimatePresence>
        </div>
    );
};

export const Lists = () => {
    const { lists, deleteList } = useLists();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isCreating, setIsCreating] = useState(false);
    const [activeList, setActiveList] = useState<any | null>(null);
    const [sharingList, setSharingList] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'lists' | 'recipes'>('lists');

    return (
        <div className="pt-10 px-6 pb-24 min-h-screen flex flex-col">
            <header className="mb-6 space-y-4">
                <div className="flex bg-cozy-100 p-1 rounded-2xl w-full">
                    <button
                        onClick={() => { setActiveTab('lists'); hapticImpact.light(); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'lists' ? 'bg-white shadow-sm text-cozy-900' : 'text-cozy-400'}`}
                    >
                        <SquareLibrary size={18} />
                        Lists
                    </button>
                    <button
                        onClick={() => { setActiveTab('recipes'); hapticImpact.light(); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'recipes' ? 'bg-white shadow-sm text-cozy-900' : 'text-cozy-400'}`}
                    >
                        <BookOpen size={18} />
                        Recipes
                    </button>
                </div>

                {activeTab === 'lists' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <h1 className="text-3xl font-bold text-cozy-900">Cloud Lists</h1>
                        <p className="text-cozy-500">Real-time sync enabled.</p>
                    </div>
                )}
            </header>

            {activeTab === 'recipes' ? (
                <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                    <Recipes />
                </div>
            ) : (
                <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between mb-4 px-1">
                        <button
                            onClick={() => setIsCreating(true)}
                            className="bg-cozy-900 text-white p-2 rounded-xl shadow-lg active:scale-90 transition-transform flex items-center gap-2 px-4"
                        >
                            <Plus size={20} />
                            <span className="font-bold text-sm">New</span>
                        </button>
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

                    <div className="flex-1">
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
                                    <div
                                        onClick={(e) => { e.stopPropagation(); setSharingList(list); }}
                                        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Share2 size={18} className="text-cozy-900" />
                                    </div>
                                </motion.button>
                            ))}

                        </div>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {isCreating && <CreateListModal onClose={() => setIsCreating(false)} />}
                {activeList && (
                    <ListDetailView
                        list={activeList}
                        onClose={() => setActiveList(null)}
                        onDelete={async () => {
                            if (window.confirm('Are you sure you want to delete this list?')) {
                                hapticImpact.heavy();
                                await deleteList(activeList.id);
                                setActiveList(null);
                            }
                        }}
                        onShare={() => setSharingList(activeList)}
                    />
                )}
                {sharingList && <ShareListModal list={sharingList} onClose={() => setSharingList(null)} />}
            </AnimatePresence>
        </div>
    );
};
