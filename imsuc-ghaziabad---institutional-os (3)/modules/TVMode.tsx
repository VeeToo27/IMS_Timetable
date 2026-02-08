
import React, { useState, useEffect } from 'react';
import { AppState } from '../types';
import { SLOTS } from '../constants';
import { Minimize, Clock, Calendar, Volume2, Building2, GraduationCap } from 'lucide-react';

interface TVModeProps {
  state: AppState;
  onClose?: () => void;
}

const TVMode: React.FC<TVModeProps> = ({ state, onClose }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const slideTimer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % state.semesters.length);
    }, 12000);
    return () => {
      clearInterval(timer);
      clearInterval(slideTimer);
    };
  }, [state.semesters.length]);

  const currentSemester = state.semesters[activeSlide];
  const filteredSections = state.sections.filter(s => s.semesterId === currentSemester?.id);
  const currentSlotIdx = 1; 

  return (
    <div className="fixed inset-0 bg-[#0a1a3a] z-[100] flex flex-col p-12 overflow-hidden">
      {/* Rebranded TV Header */}
      <div className="flex justify-between items-center mb-16">
        <div className="flex items-center gap-10">
          <div className="w-32 h-32 bg-white/5 rounded-[40px] flex items-center justify-center border border-white/10 text-white">
            <GraduationCap size={64} />
          </div>
          <div>
            <h1 className="text-7xl font-black text-white tracking-tighter mb-2 italic uppercase">OPERATIONS</h1>
            <div className="flex items-center gap-4">
              <p className="text-amber-500 font-black uppercase tracking-[0.5em] text-2xl">Digital Console</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-12 bg-white/5 p-10 rounded-[56px] border border-white/10 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)]">
          <div className="text-right">
            <p className="text-blue-400 font-black text-xs uppercase tracking-[0.3em] mb-3">Calendar</p>
            <div className="flex items-center gap-5 text-white font-black text-4xl">
              <Calendar className="text-amber-500" size={40} />
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div className="h-20 w-px bg-white/10" />
          <div className="text-right min-w-[280px]">
            <p className="text-blue-400 font-black text-xs uppercase tracking-[0.3em] mb-3">System Time</p>
            <div className="flex items-center gap-5 text-white font-black text-6xl font-mono tracking-widest">
              <Clock className="text-amber-500" size={48} />
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-6 bg-white/10 hover:bg-red-500 text-white rounded-[32px] transition-all border border-white/10 ml-6 active:scale-90">
              <Minimize size={40} />
            </button>
          )}
        </div>
      </div>

      {/* Public Display Table */}
      <div className="flex-1 space-y-12 animate-in slide-in-from-bottom-12 duration-1000">
        <div className="flex items-center justify-between bg-white/5 p-6 rounded-[40px] border border-white/5">
          <div className="flex items-center gap-8">
            <div className="bg-amber-500 h-16 w-3 rounded-full" />
            <h2 className="text-7xl font-black text-white tracking-tighter">
              {currentSemester?.name} <span className="text-blue-400 font-medium ml-4">Cluster</span>
            </h2>
          </div>
          <div className="flex gap-6">
            {state.semesters.map((_, i) => (
              <div key={i} className={`h-4 rounded-full transition-all duration-1000 ${i === activeSlide ? 'w-32 bg-amber-500 shadow-lg shadow-amber-500/50' : 'w-4 bg-white/10'}`} />
            ))}
          </div>
        </div>

        <div className="bg-white/5 rounded-[80px] p-8 border border-white/10 backdrop-blur-2xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden">
          <table className="w-full border-separate border-spacing-6">
            <thead>
              <tr className="text-blue-400 uppercase text-lg tracking-[0.5em] font-black">
                <th className="p-12 text-left w-96">Section</th>
                {SLOTS.slice(0, 5).map((slot, i) => (
                  <th key={slot.id} className={`p-10 text-center rounded-[40px] transition-all duration-700 ${i === currentSlotIdx ? 'bg-amber-500 text-[#0a1a3a] shadow-2xl shadow-amber-500/30 border-4 border-white/20' : 'text-blue-400'}`}>
                    {slot.time}
                    {i === currentSlotIdx && <span className="block text-xs font-black bg-white/20 rounded-full px-4 py-1.5 mt-3 w-fit mx-auto">CURRENT</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSections.map(section => (
                <tr key={section.id} className="group">
                  <td className="p-12">
                    <div className="text-8xl font-black text-white tracking-tighter leading-none group-hover:text-amber-500 transition-colors">{section.name}</div>
                    <div className="text-amber-500/60 font-black text-lg uppercase tracking-[0.2em] mt-6 flex items-center gap-4">
                       <Building2 size={24}/> Main Block
                    </div>
                  </td>
                  {SLOTS.slice(0, 5).map((slot, i) => {
                    const isActive = i === currentSlotIdx;
                    return (
                      <td key={slot.id}>
                        <div className={`h-64 rounded-[56px] p-10 flex flex-col justify-center transition-all duration-1000 ${
                          isActive 
                            ? 'bg-white shadow-[0_0_120px_rgba(255,255,255,0.2)] scale-105 border-b-[12px] border-amber-500' 
                            : 'bg-white/5 border border-white/5'
                        }`}>
                          <p className={`text-sm font-black uppercase tracking-[0.3em] mb-6 ${isActive ? 'text-blue-900' : 'text-blue-400'}`}>
                            LECTURE
                          </p>
                          <h4 className={`text-4xl font-black leading-tight mb-8 tracking-tight line-clamp-2 ${isActive ? 'text-[#0a1a3a]' : 'text-white/90'}`}>
                            --
                          </h4>
                          <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl transition-all ${isActive ? 'bg-[#0a1a3a] text-white' : 'bg-white/10 text-blue-300'}`}>
                              OP
                            </div>
                            <p className={`font-black text-2xl ${isActive ? 'text-[#0a1a3a]' : 'text-white/60'}`}>--</p>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campus Marquee */}
      <div className="mt-16 bg-[#7f1d1d] h-24 rounded-[40px] flex items-center px-16 relative overflow-hidden shadow-2xl border-l-[16px] border-amber-500">
        <div className="flex items-center gap-10 text-white font-black whitespace-nowrap animate-marquee">
          <Volume2 className="text-amber-400" size={40} />
          <span className="uppercase tracking-[0.4em] text-2xl text-amber-400">BULLETIN:</span>
          <span className="text-2xl italic tracking-tight">OPERATIONAL MODE ACTIVE. ALL SCHEDULES UPDATED FOR THE CURRENT SESSION.</span>
          <span className="mx-20 text-6xl text-amber-500/30">•</span>
          <span className="text-2xl uppercase">System Maintenance scheduled for Friday at 18:00.</span>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 35s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default TVMode;
