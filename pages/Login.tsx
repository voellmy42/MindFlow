import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, AlertCircle } from 'lucide-react';

// Declare Google on window
declare global {
    interface Window {
        google: any;
    }
}

// ----------------------------------------------------------------------
// Load from Environment Variable or fall back to the provided ID
// ----------------------------------------------------------------------
// Cast import.meta to any to resolve TS error with env property
const ENV_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_ID = ENV_CLIENT_ID && ENV_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID" 
    ? ENV_CLIENT_ID 
    : "1082993055232-r7sr98j8rk57cjhc04pcbqmlsc27sjt2.apps.googleusercontent.com"; 

export const Login = () => {
  const { loginWithGoogle, continueAsGuest } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Debugging Helper: Log the current origin so the user knows what to whitelist
    console.log("MindFlow: Current Window Origin (Add this to Google Cloud 'Authorized JavaScript origins'):", window.location.origin);
    console.log("MindFlow: Using Client ID:", GOOGLE_CLIENT_ID);

    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID") {
        setError("Missing Client ID");
        return;
    }

    // Wait for script to load
    const interval = setInterval(() => {
        if (window.google) {
            clearInterval(interval);
            try {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: (response: any) => {
                        if (response.credential) {
                            loginWithGoogle(response.credential);
                        }
                    },
                    auto_select: false,
                    cancel_on_tap_outside: false
                });

                const btnParent = document.getElementById("googleBtn");
                if (btnParent) {
                    window.google.accounts.id.renderButton(
                        btnParent,
                        { 
                            theme: "filled_black", 
                            size: "large", 
                            type: "standard",
                            shape: "pill",
                            text: "continue_with",
                            width: "320" 
                        }
                    );
                }
            } catch (e) {
                console.error("Google Auth Error", e);
                setError("Could not load Google Sign-In");
            }
        }
    }, 100);

    return () => clearInterval(interval);
  }, [loginWithGoogle]);

  return (
    <div className="min-h-screen bg-cozy-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-200/30 rounded-full blur-3xl" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-[2.5rem] p-8 relative z-10 text-center"
      >
        <div className="mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-cozy-900 text-white rounded-2xl mb-4 shadow-lg shadow-cozy-200">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-cozy-900 tracking-tight">MindFlow</h1>
          <p className="text-cozy-500 mt-2">Sync your thoughts.</p>
        </div>

        {/* Google Button Container */}
        <div className="min-h-[50px] flex items-center justify-center mb-6 relative">
             {error === "Missing Client ID" ? (
                 <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm flex flex-col items-center gap-2">
                     <AlertCircle size={24} />
                     <span className="font-bold">Setup Required</span>
                     <span className="text-xs">Add Client ID to code or Env Vars.</span>
                 </div>
             ) : (
                 <>
                    <div id="googleBtn" className="z-10 relative"></div>
                    {/* Fallback visual if script fails or is blocked */}
                    {!window.google && !error && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-cozy-300">
                            Loading Google Auth...
                        </div>
                    )}
                 </>
             )}
        </div>

        {error && error !== "Missing Client ID" && (
            <div className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded-lg">
                {error}
            </div>
        )}

        <div className="flex items-center justify-center my-6">
             <div className="h-px bg-cozy-200 w-full" />
             <span className="px-3 text-cozy-400 text-sm font-medium whitespace-nowrap">or</span>
             <div className="h-px bg-cozy-200 w-full" />
        </div>

        <button 
            onClick={continueAsGuest}
            className="w-full py-3 text-cozy-500 font-semibold hover:text-cozy-800 transition-colors rounded-xl hover:bg-cozy-50"
        >
            Continue Offline
        </button>
      </motion.div>

      <div className="mt-8 text-center text-cozy-400 text-xs max-w-xs">
        <p>By continuing you agree to the Terms & Privacy Policy.</p>
        
        {/* Debug Info for Deployment */}
        <div className="mt-6 p-3 bg-white/50 backdrop-blur rounded-xl border border-cozy-200 text-left">
             <p className="font-bold text-cozy-500 text-[10px] mb-1 uppercase tracking-wider">Configuration Check</p>
             <p className="text-[10px] text-cozy-400 mb-1">Add this URL to Google Cloud "Authorized JavaScript origins":</p>
             <code className="block p-2 bg-cozy-100 rounded text-[10px] font-mono text-cozy-800 break-all select-all">
                {window.location.origin}
             </code>
        </div>
      </div>
    </div>
  );
};
