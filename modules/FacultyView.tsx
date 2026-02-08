
import React, { useState } from 'react';
import { AppState, Day } from '../types';
import { SLOTS, DAYS } from '../constants';
import { Download, Bell, ToggleLeft, ToggleRight, CheckCircle2, User, Clock, MapPin } from 'lucide-react';

interface FacultyViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const FacultyView: React.FC<FacultyViewProps> = ({ state, setState }) => {
  const [selectedFaculty, setSelectedFaculty] = useState(state.faculty[0]?.id);
  const faculty = state.faculty.find(f => f.id === selectedFaculty);

  const getFacultySchedule = (day: Day) => {
    return state.masterTimetable.filter(e => e.facultyId === selectedFaculty && e.day === day);
  };

  const toggleStatus = () => {
    setState(prev => ({
      ...prev,
      faculty: prev.faculty.map(f => 
        f.id === selectedFaculty 
          ? { ...f, status: f.status === 'Present' ? 'Absent' : 'Present' } 
          : f
      )
    }));
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Faculty Profile Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-[#0a1a3a] text-white flex items-center justify-center font-black text-sm">
                {faculty?.name.charAt(0)}
             </div>
             <select 
                value={selectedFaculty} 
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="bg-transparent border-none outline-none font-black text-slate-800 text-sm cursor-pointer hover:text-blue-600 transition-colors"
              >
                {state.faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
          </div>
          <div className="h-8 w-px bg-slate-100" />
          <div className="flex items-center gap-6">
             <div className="space-y-0.5">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Workload Status</p>
               <p className="text-xs font-bold text-slate-700">
                 {state.masterTimetable.filter(e => e.facultyId === selectedFaculty).length} / {faculty?.workloadLimit} Weekly hrs
               </p>
             </div>
             <div className="space-y-0.5">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Department</p>
               <p className="text-xs font-bold text-slate-700">{faculty?.department || 'General'}</p>
             </div>
          </div>
        </div>

        <button 
          onClick={toggleStatus}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-black text-[10px] uppercase tracking-wider ${
            faculty?.status === 'Present' 
              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
          }`}
        >
          {faculty?.status === 'Present' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          {faculty?.status}
        </button>
      </div>

      {/* Grid Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {DAYS.map(day => {
          const schedule = getFacultySchedule(day).sort((a,b) => a.slotIndex - b.slotIndex);
          return (
            <div key={day} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 bg-slate-900 text-white border-b border-slate-800">
                <h3 className="font-black text-center uppercase tracking-[0.2em] text-[10px] italic">{day}</h3>
              </div>
              <div className="p-3 space-y-3 flex-1">
                {schedule.length === 0 ? (
                  <div className="py-12 text-center text-slate-200">
                    <CheckCircle2 className="mx-auto mb-2 opacity-20" size={24} />
                    <p className="text-[9px] font-black uppercase tracking-widest italic">No Classes</p>
                  </div>
                ) : (
                  schedule.map(entry => {
                    const subject = state.subjects.find(s => s.id === entry.subjectId);
                    const section = state.sections.find(s => s.id === entry.sectionId);
                    const isMorning = entry.slotIndex < 3;

                    return (
                      <div key={entry.id} className={`p-4 rounded-xl border transition-all hover:shadow-md group relative overflow-hidden ${
                        isMorning ? 'bg-blue-50/30 border-blue-100' : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-1.5 text-blue-500">
                              <Clock size={10} />
                              <span className="text-[9px] font-black uppercase tracking-tighter">P{entry.slotIndex + 1}</span>
                           </div>
                           <span className="px-1.5 py-0.5 bg-white border border-slate-100 rounded-md text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                             SEC {section?.name}
                           </span>
                        </div>
                        <h4 className="font-black text-slate-800 text-[11px] leading-tight mb-1 uppercase italic line-clamp-2">{subject?.name}</h4>
                        <div className="flex items-center gap-1.5 text-slate-400 mt-2">
                           <MapPin size={10} />
                           <span className="text-[8px] font-bold uppercase tracking-widest">Main Block</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FacultyView;
