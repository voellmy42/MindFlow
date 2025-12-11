
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, AlertCircle, LogIn, Check, ExternalLink, Copy, AlertTriangle } from 'lucide-react';
import { app } from '../lib/firebase'; // Import app to get config

export const Login = () => {
  const { loginWithGoogle, continueAsGuest } = useAuth();
  
  // Get config details for debugging
  const config = app.options;
  const projectId = config.projectId || 'Unknown';
  
  const [currentHostname, setCurrentHostname] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [isBlob, setIsBlob] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
      if (typeof window !== 'undefined') {
          setPageUrl(window.location.href);
          const protocol = window.location.protocol;
          setIsBlob(protocol === 'blob:');
          
          let hostname = window.location.hostname;
          // If in blob mode, hostname might be empty, extract from origin
          if (!hostname && protocol === 'blob:') {
             // origin is usually "https://some-domain.com"
             hostname = window.location.origin.replace(/^https?:\/\//, '');
          }
          setCurrentHostname(hostname);
      }
  }, []);

  const handleCopy = () => {
      if (currentHostname) {
          navigator.clipboard.writeText(currentHostname);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      }
  };
  
  const handleLogin = async () => {
      setError(null);
      try {
          await loginWithGoogle();
      } catch (e: any) {
          console.error("Login Error Catch:", e);
          
          if (e.code === 'auth/unauthorized-domain' || e.message?.includes('unauthorized-domain')) {
              setError(
                  <div className="flex flex-col gap-3 w-full text-red-900">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">Domain Not Authorized</span>
                    </div>
                    
                    <div className="text-xs bg-white/60 p-3 rounded-lg border border-red-200">
                        <p className="mb-2 font-semibold">1. Verify Project:</p>
                        <p className="mb-1">Firebase Project ID:</p>
                        <code className="block bg-red-100 p-1 rounded font-mono font-bold text-center mb-2">{projectId}</code>
                    </div>

                    <div className="text-xs bg-white/60 p-3 rounded-lg border border-red-200">
                        <p className="mb-2 font-semibold">2. Add to Whitelist:</p>
                        <p className="mb-1">Copy this hostname:</p>
                        <div className="relative group cursor-pointer" onClick={handleCopy}>
                             <code className="block bg-red-100 p-2 rounded font-mono font-bold text-center select-all break-all border border-red-200">
                                {currentHostname || "Unknown Hostname"}
                             </code>
                             <div className="text-[10px] text-center text-red-500 mt-1 uppercase font-bold tracking-wider">
                                {isCopied ? "Copied!" : "Click to Copy"}
                             </div>
                        </div>
                        <p className="mt-2 opacity-80 leading-relaxed">
                            Go to <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains</strong> and paste it.
                        </p>
                    </div>
                  </div>
              );
          } else if (e.code === 'auth/popup-closed-by-user') {
              setError("Sign in cancelled.");
          } else if (e.code === 'auth/network-request-failed') {
              setError("Network error. Check your connection.");
          } else if (e.code === 'auth/api-key-not-valid-please-pass-a-valid-api-key') {
             setError("Invalid API Key in lib/firebase.ts");
          } else {
              setError(e.message || "An unknown error occurred.");
          }
      }
  };

  return (
    <div className="fixed inset-0 bg-cozy-50 overflow-hidden">
        {/* Ambient Background */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

        {/* Scrollable Content Container */}
        <div className="absolute inset-0 overflow-y-auto">
            <div className="min-h-full flex flex-col items-center justify-center p-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-sm bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-[2.5rem] p-8 relative z-10 text-center my-8"
                >
                    <div className="mb-10">
                        <div className="inline-flex items-center justify-center p-4 bg-cozy-900 text-white rounded-2xl mb-4 shadow-lg shadow-cozy-200">
                            <Sparkles size={32} />
                        </div>
                        <h1 className="text-3xl font-extrabold text-cozy-900 tracking-tight">MindFlow</h1>
                        <p className="text-cozy-500 mt-2">Sync your thoughts.</p>
                    </div>

                    {/* OPEN IN NEW TAB BUTTON LOGIC */}
                    {isBlob ? (
                         <div className="w-full py-4 mb-4 bg-amber-50 text-amber-700 font-bold rounded-xl border border-amber-100 flex flex-col items-center justify-center gap-2 text-center p-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={20} />
                                <span>Preview Mode</span>
                            </div>
                            <p className="text-[10px] font-normal opacity-80 leading-tight">
                                This preview is using a "Blob" URL which blocks Google Sign-In.<br/>
                                <strong className="block mt-1">Please use your IDE's "Open in New Tab" button to get the real URL.</strong>
                            </p>
                         </div>
                    ) : (
                        <a 
                            href={pageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 mb-4 bg-indigo-50 text-indigo-700 font-bold rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 no-underline shadow-sm"
                        >
                            <ExternalLink size={20} />
                            Open in New Tab
                        </a>
                    )}

                    <button 
                        onClick={handleLogin}
                        className="w-full py-4 bg-white border border-cozy-200 text-cozy-900 font-bold rounded-xl shadow-sm hover:bg-cozy-50 transition-all flex items-center justify-center gap-3"
                    >
                        <LogIn size={20} />
                        Sign in with Google
                    </button>

                    {error && (
                        <div className="mt-6 bg-red-50 p-5 rounded-2xl text-left border border-red-100 flex items-start gap-3 w-full shadow-inner">
                            <AlertCircle className="shrink-0 mt-0.5 text-red-600" size={20} />
                            <div className="w-full min-w-0">
                                {error}
                            </div>
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
                    
                    {!isBlob && (
                        <p className="text-[10px] text-center text-cozy-400 mt-6 leading-relaxed">
                            Opening in a new tab resolves most Google Sign-In pop-up blockers.
                        </p>
                    )}

                </motion.div>
            </div>
        </div>
    </div>
  );
};
