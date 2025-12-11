import React from 'react';
import { CheckSquare, Trash2, X } from 'lucide-react';
import { useStaging } from '../hooks/useFireStore';

export const InboxView = ({ onReview, hideIfEmpty }: { onReview: (item: any) => void, hideIfEmpty?: boolean }) => {
    const { stagingItems, deleteStagingItem } = useStaging();

    if (stagingItems.length === 0) {
        if (hideIfEmpty) return null;

        return (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-in fade-in slide-in-from-bottom-4">
                <div className="w-16 h-16 bg-cozy-100 rounded-full flex items-center justify-center text-cozy-400 mb-4">
                    <CheckSquare size={32} />
                </div>
                <h3 className="text-lg font-bold text-cozy-900 mb-1">Inbox Zero</h3>
                <p className="text-cozy-500 text-sm">Capture thoughts or voice notes to triage them here.</p>
            </div>
        );
    }

    return (
        <div className="mb-6 space-y-2">
            {/* Header with clear action if needed */}
            {stagingItems.length > 0 && (
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-xs font-bold text-cozy-400 uppercase tracking-widest">Pending Review ({stagingItems.length})</h3>
                </div>
            )}

            <div className="max-h-48 overflow-y-auto space-y-2 px-1 scrollbar-thin scrollbar-thumb-cozy-200">
                {stagingItems.map((item) => (
                    <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-cozy-100 flex items-center justify-between gap-3 group active:scale-[0.99] transition-transform">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => item.status === 'ready' && onReview(item)}>
                            <div className="flex items-center gap-2 mb-0.5">
                                {item.status === 'processing' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />}
                                {item.status === 'ready' && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
                                {item.status === 'error' && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}

                                <span className="text-[10px] font-bold uppercase tracking-wider text-cozy-400">
                                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <h4 className={`text-sm font-bold text-cozy-900 leading-tight truncate ${item.status === 'processing' ? 'animate-pulse' : ''}`}>
                                {item.summary}
                            </h4>
                            {item.status === 'error' && <p className="text-[10px] text-red-500 mt-0.5 truncate">{item.error}</p>}
                        </div>

                        <div className="flex items-center gap-1">
                            {item.status === 'ready' && (
                                <button onClick={() => onReview(item)} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg font-bold text-[10px] transition-colors">
                                    Review
                                </button>
                            )}
                            {item.status === 'error' && (
                                <button onClick={() => deleteStagingItem(item.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            )}
                            {item.status === 'processing' && (
                                <button onClick={() => deleteStagingItem(item.id)} className="p-1.5 text-cozy-300 hover:text-red-500 rounded-lg transition-colors">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
