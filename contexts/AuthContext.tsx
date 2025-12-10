import React, { createContext, useContext, useState, useEffect } from 'react';
import { hapticImpact } from '../services/haptics';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: (credential: string) => void;
  logout: () => void;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to decode JWT without external library
function parseJwt (token: string) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing session
    const storedUser = localStorage.getItem('mindflow_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const loginWithGoogle = (credential: string) => {
    try {
        const payload = parseJwt(credential);
        
        const googleUser: User = {
            id: payload.sub, // Google unique ID
            name: payload.name,
            email: payload.email,
            avatar: payload.picture
        };

        setUser(googleUser);
        localStorage.setItem('mindflow_user', JSON.stringify(googleUser));
        hapticImpact.success();
    } catch (e) {
        console.error("Failed to parse Google token", e);
        hapticImpact.error();
    }
  };

  const continueAsGuest = () => {
     const guestUser: User = {
         id: 'guest',
         name: 'Guest',
         email: '',
         avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=guest'
     };
     setUser(guestUser);
     localStorage.setItem('mindflow_user', JSON.stringify(guestUser));
     hapticImpact.light();
  };

  const logout = () => {
    hapticImpact.medium();
    setUser(null);
    localStorage.removeItem('mindflow_user');
    // Also revoke google token if needed, but for local-first PWA, clearing local state is usually sufficient for UI
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
