
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Inbox } from './pages/Inbox';
import { Triage } from './pages/Triage';
import { Lists } from './pages/Lists';
import { AllTasks } from './pages/AllTasks';
import { Login } from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { db } from './lib/firebase'; // Firestore
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { TaskStatus } from './types';
import { hapticImpact } from './services/haptics';

// --- Wake Up Service ---
// Checks for tasks that were snoozed or scheduled for the past/today and moves them to TODAY status
const WakeUpService = () => {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;

    const checkAndPromoteTasks = async () => {
      const now = Date.now();
      
      // Query tasks that are SNOOZED and due <= now
      const q = query(
          collection(db, 'tasks'),
          where('status', '==', TaskStatus.SNOOZED),
          where('dueAt', '<=', now)
      );

      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        let count = 0;
        
        snapshot.forEach(t => {
           // Double check ownership or permissions in real app, but query implicitly implies visibility if rules set
           batch.update(doc(db, 'tasks', t.id), { status: TaskStatus.TODAY });
           count++;
        });

        await batch.commit();
        if (count > 0) {
            console.log(`Waking up ${count} tasks`);
            hapticImpact.medium();
        }
      }
    };

    checkAndPromoteTasks();
    const interval = setInterval(checkAndPromoteTasks, 60000);
    return () => clearInterval(interval);
  }, [user]);

  return null;
};

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-cozy-50 text-cozy-300">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Router>
      <WakeUpService />
      <div className="min-h-screen bg-cozy-50 text-cozy-900 font-sans antialiased selection:bg-rose-200 selection:text-rose-900">
        <main className="max-w-md mx-auto h-full min-h-screen bg-white shadow-2xl overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Inbox />} />
            <Route path="/triage" element={<Triage />} />
            <Route path="/lists" element={<Lists />} />
            <Route path="/all" element={<AllTasks />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Navigation />
        </main>
      </div>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
        <AppContent />
    </AuthProvider>
  );
}

export default App;
