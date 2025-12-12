
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { hapticImpact } from '../services/haptics';
import { User } from '../types'; // Import User from types

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety Timeout: If Firebase doesn't respond in 4 seconds, stop loading so user sees Login screen.
    const timeoutTimer = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn("Auth check timed out. Defaulting to logged out state.");
        setIsLoading(false);
      }
    }, 4000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return;

      // Clear safety timer as we got a response
      clearTimeout(timeoutTimer);

      if (firebaseUser) {
        const userData: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Guest',
          email: firebaseUser.email || '',
          avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${firebaseUser.uid}`
        };

        setUser(userData);

        // SYNC USER TO FIRESTORE (For autocomplete)
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            ...userData,
            lastSeen: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.error("Failed to sync user profile", e);
        }

      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutTimer);
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      hapticImpact.success();
    } catch (error: any) {
      console.error("Login failed", error);
      hapticImpact.error();
      throw error;
    }
  };

  const continueAsGuest = async () => {
    try {
      await signInAnonymously(auth);
      hapticImpact.light();
    } catch (error) {
      console.error("Guest login failed", error);
      throw error;
    }
  };

  const logout = async () => {
    hapticImpact.medium();
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, loginWithGoogle, logout, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
