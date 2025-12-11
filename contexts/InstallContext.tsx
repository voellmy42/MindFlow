
import React, { createContext, useContext, useState, useEffect } from 'react';

interface InstallContextType {
    isInstallable: boolean;
    handleInstallClick: () => void;
}

const InstallContext = createContext<InstallContextType>({
    isInstallable: false,
    handleInstallClick: () => { },
});

export const useInstallPrompt = () => useContext(InstallContext);

export const InstallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setIsInstallable(false);
    };

    return (
        <InstallContext.Provider value={{ isInstallable, handleInstallClick }}>
            {children}
        </InstallContext.Provider>
    );
};
