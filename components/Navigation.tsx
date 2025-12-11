
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Inbox, Layers, List, Calendar } from 'lucide-react';
import { vibrate } from '../services/haptics';

const NavItem = ({ to, icon: Icon, active, label }: { to: string; icon: any; active: boolean; label: string }) => (
  <Link
    to={to}
    onClick={() => vibrate(5)}
    className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${active ? 'text-cozy-900 scale-105' : 'text-cozy-400 hover:text-cozy-600'
      }`}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] font-medium mt-1">{label}</span>
  </Link>
);

export const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-t border-cozy-200 flex justify-around items-center px-2 pb-2 z-50 shadow-lg">
      <NavItem to="/" icon={Inbox} active={location.pathname === '/' || location.pathname === '/capture'} label="Flow" />
      <NavItem to="/triage" icon={Layers} active={location.pathname === '/triage'} label="Triage" />
      <NavItem to="/all" icon={Calendar} active={location.pathname === '/all'} label="Plan" />
      <NavItem to="/lists" icon={List} active={location.pathname === '/lists' || location.pathname === '/recipes'} label="Lists" />
    </nav>
  );
};
