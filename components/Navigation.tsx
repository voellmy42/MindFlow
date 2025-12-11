import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Inbox, Layers, List, Calendar } from 'lucide-react';
import { vibrate } from '../services/haptics';
import { useTasks } from '../hooks/useFireStore';
import { TaskStatus } from '../types';

const NavItem = ({ to, icon: Icon, active, label, badgeCount }: { to: string; icon: any; active: boolean; label: string; badgeCount?: number }) => (
  <Link
    to={to}
    onClick={() => vibrate(5)}
    className={`flex flex-col items-center justify-center w-full h-full relative transition-all duration-200 active:scale-90 ${active ? 'text-cozy-900 scale-105 font-bold' : 'text-cozy-400 hover:text-cozy-600'
      }`}
  >
    <div className="relative">
      <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      {badgeCount && badgeCount > 0 ? (
        <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm ring-1 ring-white">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      ) : null}
    </div>
    <span className="text-[10px] mt-1">{label}</span>
  </Link>
);

export const Navigation = () => {
  const location = useLocation();
  const { tasks: inboxTasks } = useTasks({ status: TaskStatus.INBOX, excludeDeleted: true });
  const { tasks: todayTasks } = useTasks({ status: TaskStatus.TODAY, excludeDeleted: true });

  const activeTasksCount = todayTasks.filter(t => t.status !== TaskStatus.DONE).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-xl border-t border-white/50 flex justify-around items-center px-2 pb-2 z-50 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.05)]">
      <NavItem to="/" icon={Inbox} active={location.pathname === '/' || location.pathname === '/capture'} label="Flow" badgeCount={activeTasksCount} />
      <NavItem to="/triage" icon={Layers} active={location.pathname === '/triage'} label="Triage" badgeCount={inboxTasks.length} />
      <NavItem to="/all" icon={Calendar} active={location.pathname === '/all'} label="Plan" />
      <NavItem to="/lists" icon={List} active={location.pathname === '/lists' || location.pathname === '/recipes'} label="Lists" />
    </nav>
  );
};
