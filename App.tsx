
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Inbox } from './pages/Inbox';
import { Triage } from './pages/Triage';
import { Lists } from './pages/Lists';
import { AllTasks } from './pages/AllTasks';
import { Login } from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

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
