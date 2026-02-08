
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './modules/Dashboard';
import MasterTimetable from './modules/MasterTimetable';
import DailyAdjustments from './modules/DailyAdjustments';
import DataManagement from './modules/DataManagement';
import FacultyView from './modules/FacultyView';
import { MOCK_STATE } from './constants';
import { AppState } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [state, setState] = useState<AppState>(MOCK_STATE);

  useEffect(() => {
    const saved = localStorage.getItem('chronos_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) setState(parsed);
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chronos_state', JSON.stringify(state));
  }, [state]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard state={state} setState={setState} setActiveTab={setActiveTab} />;
      case 'master': return <MasterTimetable state={state} setState={setState} />;
      case 'faculty_view': return <FacultyView state={state} setState={setState} />;
      case 'adjustment': return <DailyAdjustments state={state} setState={setState} />;
      case 'database': return <DataManagement state={state} setState={setState} />;
      default: return <div className="p-10 text-slate-500">Module under development</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 ml-64 p-12 overflow-y-auto">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight capitalize italic">{activeTab.replace('_', ' ').replace('-', ' ')}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm animate-pulse"></span>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Session Operations</p>
            </div>
          </div>
          <div className="flex gap-4">
             <div className="px-6 py-3 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Period</span>
                <span className="text-xs font-black text-[#0a1a3a]">2024 - 25</span>
             </div>
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
