import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLists } from '../hooks/useFireStore';
import { Loader2, AlertCircle } from 'lucide-react';

export const Join = () => {
    const { sharedId } = useParams<{ sharedId: string }>();
    const navigate = useNavigate();
    const { joinList } = useLists();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleJoin = async () => {
            if (!sharedId) {
                setError("Invalid link.");
                return;
            }

            try {
                const result = await joinList(sharedId);
                // Navigate even if already joined, just take them there
                navigate('/lists');
            } catch (err: any) {
                console.error("Join error:", err);
                setError(err.message || "Failed to join list. It may have been deleted or you don't have permission.");
            }
        };

        handleJoin();
    }, [sharedId, joinList, navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-rose-50 p-6 text-center">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Unavailable</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-cozy-50">
            <div className="flex flex-col items-center gap-4 text-cozy-400">
                <Loader2 className="animate-spin" size={48} />
                <p className="font-medium animate-pulse">Joining list...</p>
            </div>
        </div>
    );
};
