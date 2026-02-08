
import React, { useMemo } from 'react';
import { Users, Clock, PlayCircle, PlusCircle, GraduationCap, ShieldCheck, AlertTriangle, TrendingUp, UserCheck, Briefcase } from 'lucide-react';
import { AppState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { detectAllConflicts } from '../services/scheduler';

interface DashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, setActiveTab }) => {
  const conflicts = detectAllConflicts(state.masterTimetable, state);
  
  const stats = [
    { label: 'Active Faculty', value: state.faculty.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'System Health', value: conflicts.hard.length === 0 ? '100%' : 'Alert', icon: ShieldCheck, color: conflicts.hard.length > 0 ? 'text-red-600' : 'text-green-600', bg: conflicts.hard.length > 0 ? 'bg-red-50' : 'bg-green-50' },
    { label: 'Weekly Sessions', value: state.masterTimetable.length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Program Count', value: state.semesters.length, icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  // Faculty Workload Analytics
  const facultyWorkload = useMemo(() => {
    return state.faculty.map(f => {
      const lectures = state.masterTimetable.filter(e => e.facultyId === f.id && e.entryType === 'lecture').length;
      const utilization = (lectures / f.workloadLimit) * 100;
      return {
        id: f.id,
        fullName: f.name,
        shortName: f.name.split(' ').pop() || f.name,
        lectures: lectures,
        limit: f.workloadLimit,
        utilization: Math.round(utilization),
        dept: f.department
      };
    }).sort((a, b) => b.lectures - a.lectures);
  }, [state.faculty, state.masterTimetable]);

  const topWorkloadData = facultyWorkload.slice(0, 10);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700 max-w-[1600px] mx-auto text-left">
      
      {/* Dynamic Banner */}
      <div className="relative p-12 rounded-[48px] bg-[#0a1a3a] text-white overflow-hidden shadow-2xl border border-white/5">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/10 mb-6">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80">System Live • Academic Year 2024-25</span>
            </div>
            <h2 className="text-5xl font-black italic tracking-tighter uppercase leading-tight mb-4">
              Institutional <br/><span className="text-amber-500">Intelligence</span> Hub
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] max-w-md">
              Automated scheduling and real-time operational oversight for IMSUC Ghaziabad.
            </p>
          </div>
          <div className="hidden lg:flex justify-end">
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-6 rounded-[32px] border border-white/10 backdrop-blur-md">
                   <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Mappings</p>
                   <p className="text-3xl font-black">{state.assignments.length}</p>
                </div>
                <div className="bg-white/5 p-6 rounded-[32px] border border-white/10 backdrop-blur-md">
                   <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">Sections Managed</p>
                   <p className="text-3xl font-black">{state.sections.length}</p>
                </div>
             </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center gap-5 group hover:border-[#0a1a3a] transition-all">
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <span className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Workload Distribution Chart */}
        <div className="xl:col-span-2 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-900 italic uppercase flex items-center gap-3">
                <TrendingUp size={24} className="text-blue-500" />
                Workload Distribution
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Lectures per Faculty • Target Max: 18</p>
            </div>
            <div className="flex gap-2">
               <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0a1a3a]"></span>
                  <span className="text-[9px] font-black uppercase text-slate-500">Normal</span>
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-xl">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span>
                  <span className="text-[9px] font-black uppercase text-red-500">Critical</span>
               </div>
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topWorkloadData}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="shortName" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10, fontWeight: 800}} 
                  dy={15} 
                />
                <YAxis hide domain={[0, 20]} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px', borderLeft: '8px solid #0a1a3a'}}
                />
                <Bar dataKey="lectures" radius={[12, 12, 0, 0]} barSize={48}>
                  {topWorkloadData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.lectures > 15 ? '#ef4444' : '#0a1a3a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions & Summary */}
        <div className="space-y-8">
           <div className={`p-10 rounded-[40px] border flex flex-col items-center justify-center text-center space-y-6 ${conflicts.hard.length === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center shadow-xl ${conflicts.hard.length === 0 ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-red-500 text-white shadow-red-500/20'}`}>
                 {conflicts.hard.length === 0 ? <ShieldCheck size={40} /> : <AlertTriangle size={40} />}
              </div>
              <div className="space-y-2">
                 <h4 className={`text-2xl font-black uppercase italic ${conflicts.hard.length === 0 ? 'text-green-900' : 'text-red-900'}`}>
                   {conflicts.hard.length === 0 ? 'Grid Stable' : 'Action Required'}
                 </h4>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-tight leading-relaxed px-4">
                   {conflicts.hard.length === 0 
                    ? 'All academic constraints satisfied. The master grid is globally conflict-free.' 
                    : `Alert: ${conflicts.hard.length} hard violations detected. Adjust the master plan to maintain grid integrity.`}
                 </p>
              </div>
              <button 
                onClick={() => setActiveTab('master')}
                className={`px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                  conflicts.hard.length === 0 ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/20' : 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20'
                }`}
              >
                Inspect Master Plan
              </button>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setActiveTab('master')} className="p-8 bg-white border border-slate-200 rounded-[32px] text-center hover:border-[#0a1a3a] transition-all group shadow-sm flex flex-col items-center gap-4">
                <PlayCircle className="text-slate-300 group-hover:text-[#0a1a3a] transition-colors" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#0a1a3a]">Master Plan</p>
              </button>
              <button onClick={() => setActiveTab('adjustment')} className="p-8 bg-white border border-slate-200 rounded-[32px] text-center hover:border-[#0a1a3a] transition-all group shadow-sm flex flex-col items-center gap-4">
                <PlusCircle className="text-slate-300 group-hover:text-[#0a1a3a] transition-colors" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#0a1a3a]">Daily Adjust</p>
              </button>
           </div>
        </div>
      </div>

      {/* Faculty Workload Ledger Table */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
          <div>
            <h3 className="text-xl font-black text-slate-900 italic uppercase flex items-center gap-3">
               <Briefcase size={24} className="text-amber-500" />
               Faculty Workload Ledger
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Full Inventory of Weekly Academic Responsibilities</p>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase">Average Utilization</p>
                <p className="text-xl font-black text-blue-600">
                  {Math.round(facultyWorkload.reduce((acc, f) => acc + f.utilization, 0) / facultyWorkload.length)}%
                </p>
             </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                <th className="p-8 text-left">Staff Member</th>
                <th className="p-8 text-left">Department</th>
                <th className="p-8 text-center">Sessions / Wk</th>
                <th className="p-8 text-center">Capacity Index</th>
                <th className="p-8 text-right">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {facultyWorkload.map(f => (
                <tr key={f.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="p-8">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm uppercase group-hover:scale-110 transition-transform">{f.fullName.charAt(0)}</div>
                       <div>
                         <p className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{f.fullName}</p>
                         <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">ID: {f.id}</p>
                       </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <span className="px-3 py-1.5 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest">{f.dept}</span>
                  </td>
                  <td className="p-8 text-center">
                    <span className={`text-xl font-black ${f.lectures > 15 ? 'text-red-500' : 'text-slate-900'}`}>{f.lectures}</span>
                    <span className="text-xs font-bold text-slate-400 ml-1">/ {f.limit}</span>
                  </td>
                  <td className="p-8">
                    <div className="flex flex-col items-center gap-2">
                       <div className="w-full max-w-[120px] h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                          <div 
                            className={`h-full transition-all duration-1000 ${f.utilization > 85 ? 'bg-red-500' : f.utilization > 50 ? 'bg-amber-500' : 'bg-blue-600'}`} 
                            style={{ width: `${Math.min(f.utilization, 100)}%` }}
                          />
                       </div>
                       <span className="text-[10px] font-black text-slate-400">{f.utilization}% Load</span>
                    </div>
                  </td>
                  <td className="p-8 text-right">
                     <div className="flex items-center justify-end gap-3">
                        {f.utilization > 90 ? (
                           <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                              <AlertTriangle size={14}/>
                              <span className="text-[9px] font-black uppercase tracking-widest">Saturation</span>
                           </div>
                        ) : (
                           <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                              <UserCheck size={14}/>
                              <span className="text-[9px] font-black uppercase tracking-widest">Optimized</span>
                           </div>
                        )}
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
