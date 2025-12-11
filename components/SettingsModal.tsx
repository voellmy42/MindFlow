import React, { useState } from 'react';
import { X } from 'lucide-react';
import { hapticImpact } from '../services/haptics';

export const SettingsModal = ({ onClose }: { onClose: () => void }) => {
    const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');

    const handleSave = () => {
        localStorage.setItem('gemini_api_key', apiKey);
        hapticImpact.success();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-cozy-900">Settings</h3>
                    <button onClick={onClose} className="p-2 bg-cozy-50 rounded-full text-cozy-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-cozy-700 mb-2">Gemini API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full p-4 bg-cozy-50 rounded-xl border border-cozy-200 outline-none focus:border-indigo-500 transition-colors font-mono text-sm"
                        />
                        <p className="text-xs text-cozy-400 mt-2">Required for voice intelligence.</p>
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full py-4 bg-cozy-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};
