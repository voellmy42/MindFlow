import React from 'react';
import { CheckSquare, Trash2, X } from 'lucide-react';
import { useStaging } from '../hooks/useFireStore';

export const InboxView = ({ onReview }: { onReview: (item: any) => void }) => {
    const { stagingItems, deleteStagingItem } = useStaging();

    if (stagingItems.length === 0) {
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
        <div className="space-y-3 px-1 animate-in fade-in slide-in-from-bottom-4">
            {stagingItems.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-cozy-100 flex items-center justify-between gap-3 group">
                    <div className="flex-1 min-w-0" onClick={() => item.status === 'ready' && onReview(item)}>
                        <div className="flex items-center gap-2 mb-1">
                            {item.status === 'processing' && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
                            {item.status === 'ready' && <div className="w-2 h-2 rounded-full bg-green-500" />}
                            {item.status === 'error' && <div className="w-2 h-2 rounded-full bg-red-500" />}

                            <span className="text-xs font-bold uppercase tracking-wider text-cozy-400">
                                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <h4 className={`font-bold text-cozy-900 ${item.status === 'processing' ? 'animate-pulse' : ''}`}>
                            {item.summary}
                        </h4>
                        {item.status === 'error' && <p className="text-xs text-red-500 mt-1">{item.error}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                        {item.status === 'ready' && (
                            <button onClick={() => onReview(item)} className="p-2 bg-indigo-100 text-indigo-600 rounded-xl font-bold text-xs">
                                Review
                            </button>
                        )}
                        {item.status === 'error' && (
                            <button onClick={() => deleteStagingItem(item.id)} className="p-2 bg-red-50 text-red-600 rounded-xl">
                                <Trash2 size={16} />
                            </button>
                        )}
                        {item.status === 'processing' && (
                            <button onClick={() => deleteStagingItem(item.id)} className="p-2 text-cozy-300 hover:text-red-500 rounded-xl">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};
