
import React from 'react';
import { LayoutDashboard, CalendarDays, UserCheck, Settings, Users } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'master', label: 'Master Plan', icon: CalendarDays },
    { id: 'faculty_view', label: 'Faculty Schedule', icon: Users },
    { id: 'adjustment', label: 'Daily Adjust', icon: UserCheck },
    { id: 'database', label: 'Database', icon: Settings },
  ];

  return (
    <div className="w-64 bg-[#0a1a3a] h-screen text-slate-300 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-12 flex flex-col items-center">
        <div className="text-center">
          <h1 className="text-xl font-black text-white tracking-[0.3em] uppercase">CHRONOS</h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2 opacity-60">Academic Operations</p>
        </div>
      </div>
      
      <nav className="flex-1 mt-6 px-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-200 group ${
              activeTab === item.id 
                ? 'bg-amber-500 text-[#0a1a3a] font-bold shadow-lg shadow-amber-500/10' 
                : 'hover:bg-white/5 hover:text-white'
            }`}
          >
            <item.icon size={18} className={activeTab === item.id ? 'text-[#0a1a3a]' : 'text-slate-500 group-hover:text-white'} />
            <span className="text-xs uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-8 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white uppercase">
            AD
          </div>
          <div>
            <p className="text-[10px] font-bold text-white uppercase tracking-tight">System Admin</p>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">v2.1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
