import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Inbox } from './pages/Inbox';
import { Triage } from './pages/Triage';
import { Recipes } from './pages/Recipes';
import { AllTasks } from './pages/AllTasks';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-cozy-50 text-cozy-900 font-sans antialiased selection:bg-rose-200 selection:text-rose-900">
        <main className="max-w-md mx-auto h-full min-h-screen bg-white shadow-2xl overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Inbox />} />
            <Route path="/triage" element={<Triage />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/all" element={<AllTasks />} />
          </Routes>
          <Navigation />
        </main>
      </div>
    </Router>
  );
}

export default App;