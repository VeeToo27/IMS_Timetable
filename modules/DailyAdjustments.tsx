
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, Day, DailyAvailability, TimetableEntry, EntryType, Faculty } from '../types';
import { DAYS } from '../constants';
import { cloneMasterToDaily, detectAllConflicts, ConflictResult } from '../services/scheduler';
import { 
  UserX, RefreshCw, Search, Clock, Calendar, 
  X, Plus, Trash2, CheckCircle2,
  Power, AlertTriangle, User, ChevronDown, Coffee, AlertCircle,
  Download, Zap, BookOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface DailyAdjustmentsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const DailyAdjustments: React.FC<DailyAdjustmentsProps> = ({ state, setState }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [overrideDay, setOverrideDay] = useState<Day | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'availability' | 'editor'>('availability');
  const [assigningSlot, setAssigningSlot] = useState<{ sectionId: string, slotIdx: number } | null>(null);
  const [conflicts, setConflicts] = useState<ConflictResult>({ hard: [], warnings: [] });
  
  // Modal states for manual entry in daily sheet
  const [manualEntryMode, setManualEntryMode] = useState<'sub' | 'workshop' | 'lunch'>('sub');
  const [eventTitle, setEventTitle] = useState('');

  const dateDay = useMemo(() => {
    if (overrideDay) return overrideDay;
    const date = new Date(selectedDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];
    return (DAYS.includes(dayName as Day) ? dayName as Day : Day.Monday);
  }, [selectedDate, overrideDay]);

  useEffect(() => {
    const dailySheet = state.dailyAdjustments[selectedDate] || [];
    setConflicts(detectAllConflicts(dailySheet, state, selectedDate));
  }, [state.dailyAdjustments, state.facultyAvailability, selectedDate, state.sections, state.semesters]);

  const currentAvailabilities = state.facultyAvailability[selectedDate] || [];
  const dailySchedule = state.dailyAdjustments[selectedDate] || [];

  const updateAvailability = (facultyId: string, status: 'Present' | 'Absent') => {
    setState(prev => {
      const existing = prev.facultyAvailability[selectedDate] || [];
      const facultyIdx = existing.findIndex(a => a.facultyId === facultyId);
      let newAvails;
      if (facultyIdx > -1) {
        newAvails = [...existing];
        newAvails[facultyIdx] = { ...newAvails[facultyIdx], status };
      } else {
        newAvails = [...existing, { facultyId, date: selectedDate, status, unavailableSlots: [] } as DailyAvailability];
      }

      // If marked absent, auto-remove their entries from the daily adjustment sheet
      let updatedDaily = prev.dailyAdjustments[selectedDate] || [];
      if (status === 'Absent') {
        updatedDaily = updatedDaily.filter(e => e.facultyId !== facultyId);
      }

      return { 
        ...prev, 
        facultyAvailability: { ...prev.facultyAvailability, [selectedDate]: newAvails },
        dailyAdjustments: { ...prev.dailyAdjustments, [selectedDate]: updatedDaily }
      };
    });
  };

  const updateSlotAvailability = (facultyId: string, slotIdx: number) => {
    setState(prev => {
      const existing = prev.facultyAvailability[selectedDate] || [];
      const avail = existing.find(a => a.facultyId === facultyId);
      const slots = avail?.unavailableSlots || [];
      const newSlots = slots.includes(slotIdx) ? slots.filter(s => s !== slotIdx) : [...slots, slotIdx];
      
      const updatedAvails = existing.map(a => a.facultyId === facultyId ? { ...a, unavailableSlots: newSlots } : a);
      if (!avail) {
        updatedAvails.push({ facultyId, date: selectedDate, status: 'Present', unavailableSlots: [slotIdx] });
      }

      // If marked unavailable for slot, remove entry
      let updatedDaily = prev.dailyAdjustments[selectedDate] || [];
      if (newSlots.includes(slotIdx)) {
        updatedDaily = updatedDaily.filter(e => !(e.facultyId === facultyId && e.slotIndex === slotIdx));
      }

      return {
        ...prev,
        facultyAvailability: { ...prev.facultyAvailability, [selectedDate]: updatedAvails },
        dailyAdjustments: { ...prev.dailyAdjustments, [selectedDate]: updatedDaily }
      };
    });
  };

  const handleSyncFromMaster = () => {
    if (dailySchedule.length > 0 && !confirm("Override current daily sheet with master plan?")) return;
    const cloned = cloneMasterToDaily(selectedDate, dateDay, state);
    setState(prev => ({ ...prev, dailyAdjustments: { ...prev.dailyAdjustments, [selectedDate]: cloned } }));
    setViewMode('editor');
  };

  const executeDailyEntry = (type: EntryType, facultyId?: string, title?: string) => {
    if (!assigningSlot) return;
    const newEntry: TimetableEntry = {
      id: `daily-manual-${Date.now()}`,
      sectionId: assigningSlot.sectionId,
      day: dateDay,
      slotIndex: assigningSlot.slotIdx,
      facultyId,
      title,
      entryType: type,
      isLocked: false,
      subjectId: facultyId ? state.assignments.find(a => a.facultyId === facultyId)?.subjectId : undefined
    };

    setState(prev => ({
      ...prev,
      dailyAdjustments: {
        ...prev.dailyAdjustments,
        [selectedDate]: [
          ...(prev.dailyAdjustments[selectedDate] || []).filter(e => !(e.sectionId === assigningSlot.sectionId && e.slotIndex === assigningSlot.slotIdx)),
          newEntry
        ]
      }
    }));
    closeAssignModal();
  };

  const closeAssignModal = () => {
    setAssigningSlot(null);
    setEventTitle('');
    setManualEntryMode('sub');
  };

  const exportDailyTimetable = () => {
    const wb = XLSX.utils.book_new();
    
    state.semesters.forEach(sem => {
      const sections = state.sections.filter(s => s.semesterId === sem.id);
      const rows: any[] = [];
      
      sections.forEach(sec => {
        const row: any = { Section: sec.name };
        for (let i = 0; i < state.config.totalSlots; i++) {
          const entry = dailySchedule.find(e => e.sectionId === sec.id && e.slotIndex === i);
          const isLunch = sem.lunchEnabled && sem.lunchSlotIndex === i;
          
          if (isLunch) {
            row[`P${i+1}`] = "LUNCH";
          } else if (entry) {
            const faculty = state.faculty.find(f => f.id === entry.facultyId);
            const subject = state.subjects.find(s => s.id === entry.subjectId);
            row[`P${i+1}`] = entry.entryType === 'lecture' || entry.entryType === 'substitution' 
              ? `${subject?.name || '---'} (${faculty?.name || 'TBD'})`
              : entry.title || entry.entryType?.toUpperCase();
          } else {
            row[`P${i+1}`] = "---";
          }
        }
        rows.push(row);
      });
      
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, sem.name);
    });
    
    XLSX.writeFile(wb, `Daily_Schedule_${selectedDate}.xlsx`);
  };

  const substitutionCandidates = useMemo(() => {
    if (!assigningSlot) return [];
    return state.faculty.map(f => {
      const avail = currentAvailabilities.find(a => a.facultyId === f.id);
      const isAbsent = avail?.status === 'Absent' || avail?.unavailableSlots.includes(assigningSlot.slotIdx);
      const facultyDaySchedule = dailySchedule.filter(e => e.facultyId === f.id);
      const currentTeachingEntry = facultyDaySchedule.find(e => e.slotIndex === assigningSlot.slotIdx);
      const isTeaching = !!currentTeachingEntry;
      const teachingSectionName = isTeaching ? state.sections.find(s => s.id === currentTeachingEntry.sectionId)?.name : null;
      const teachingSemesterName = isTeaching ? state.semesters.find(sem => sem.id === state.sections.find(s => s.id === currentTeachingEntry.sectionId)?.semesterId)?.name : null;
      const dailyLoad = facultyDaySchedule.length;
      
      let rank = 100;
      if (isAbsent || isTeaching) rank = 0;
      else {
        rank -= (dailyLoad * 10);
        if (state.assignments.some(a => a.facultyId === f.id && a.sectionId === assigningSlot.sectionId)) rank += 50;
      }
      
      return { 
        faculty: f, 
        isBusy: isAbsent || isTeaching, 
        busyReason: isAbsent ? 'Absent' : (isTeaching ? `Teaching: ${teachingSemesterName}-${teachingSectionName}` : null),
        load: dailyLoad, 
        rank,
        schedule: facultyDaySchedule
      };
    }).sort((a, b) => b.rank - a.rank);
  }, [assigningSlot, state.faculty, currentAvailabilities, dailySchedule, state.sections, state.semesters]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto text-left">
      
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
             <div className="w-full sm:w-auto">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-1">Target Date</label>
               <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl shadow-inner">
                 <Calendar size={14} className="text-[#0a1a3a]" />
                 <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none outline-none font-bold text-[#0a1a3a] text-xs" />
               </div>
             </div>

             <div className="w-full sm:w-auto">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-1">Operational Day</label>
               <div className="relative">
                 <select value={overrideDay || ''} onChange={(e) => setOverrideDay(e.target.value as Day || null)} className="h-[46px] pl-5 pr-10 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs text-[#0a1a3a] appearance-none outline-none shadow-inner">
                   <option value="">Detection: {dateDay}</option>
                   {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                 </select>
                 <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
               </div>
             </div>

             <div className="bg-slate-50 p-1.5 rounded-2xl border border-slate-100 flex h-[46px] self-end shadow-inner">
               <button onClick={() => setViewMode('availability')} className={`px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'availability' ? 'bg-[#0a1a3a] text-white shadow-lg' : 'text-slate-400'}`}>Roll Call</button>
               <button onClick={() => setViewMode('editor')} className={`px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'editor' ? 'bg-[#0a1a3a] text-white shadow-lg' : 'text-slate-400'}`}>Adjustment</button>
             </div>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
             <button onClick={exportDailyTimetable} className="flex-1 lg:flex-none px-6 py-3 bg-white border border-slate-200 text-[#0a1a3a] rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95"><Download size={14}/> Download Plan</button>
             <button onClick={handleSyncFromMaster} className="flex-1 lg:flex-none px-6 py-3 bg-[#0a1a3a] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95"><RefreshCw size={14}/> Clone Master</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/30">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input type="text" placeholder="Search staff or sections..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-[#0a1a3a]" />
           </div>
           <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">Cycle Day</p>
                <p className="text-sm font-black text-[#0a1a3a] italic">{dateDay} @ {selectedDate}</p>
              </div>
           </div>
        </div>

        {viewMode === 'availability' ? (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-400 uppercase text-[9px] font-black tracking-widest">
                  <th className="p-6 text-left sticky left-0 bg-slate-50 z-20 w-80">Faculty Provisioning</th>
                  <th className="p-6 text-center w-40">Roll Call</th>
                  {Array.from({ length: state.config.totalSlots }).map((_, i) => (
                    <th key={i} className="p-6 text-center">P{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.faculty.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())).map(f => {
                  const avail = currentAvailabilities.find(a => a.facultyId === f.id);
                  const isAbsent = avail?.status === 'Absent';
                  return (
                    <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6 sticky left-0 bg-white z-10 border-r border-slate-50">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">{f.name.charAt(0)}</div>
                           <p className="font-black text-slate-700 text-xs uppercase truncate tracking-tight">{f.name}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <button onClick={() => updateAvailability(f.id, isAbsent ? 'Present' : 'Absent')} className={`w-full py-2.5 rounded-xl text-[10px] font-black transition-all ${isAbsent ? 'bg-red-500 text-white shadow-md shadow-red-500/20' : 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100'}`}>
                          {isAbsent ? 'ABSENT' : 'PRESENT'}
                        </button>
                      </td>
                      {Array.from({ length: state.config.totalSlots }).map((_, i) => {
                        const isUnavailable = avail?.unavailableSlots.includes(i);
                        const teachingEntry = dailySchedule.find(e => e.facultyId === f.id && e.slotIndex === i);
                        const section = teachingEntry ? state.sections.find(s => s.id === teachingEntry.sectionId) : null;
                        
                        return (
                          <td key={i} className="p-2 min-w-[120px]">
                             <button 
                               disabled={isAbsent} 
                               onClick={() => updateSlotAvailability(f.id, i)} 
                               className={`w-full h-14 rounded-2xl border-2 transition-all flex flex-col items-center justify-center px-1 overflow-hidden ${
                                 isAbsent ? 'bg-slate-50 opacity-20 border-slate-50 cursor-not-allowed' : 
                                 isUnavailable ? 'bg-amber-100 border-amber-200 text-amber-700' : 
                                 teachingEntry ? 'bg-blue-900 border-blue-900 text-white shadow-lg' :
                                 'bg-white border-slate-100 hover:border-[#0a1a3a] text-slate-300'
                               }`}
                             >
                               {isAbsent ? <Power size={14}/> : (
                                 <>
                                   <span className="text-[7px] font-black uppercase opacity-60 mb-0.5">P{i+1}</span>
                                   {teachingEntry ? (
                                     <span className="text-[9px] font-black truncate w-full uppercase">{section?.name}</span>
                                   ) : (
                                     isUnavailable ? <Power size={12}/> : <CheckCircle2 size={12}/>
                                   )}
                                 </>
                               )}
                             </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-400 uppercase text-[9px] font-black tracking-widest border-b border-slate-100">
                  <th className="p-8 text-left w-72 border-r sticky left-0 bg-slate-50 z-10">Section Hub</th>
                  {Array.from({ length: state.config.totalSlots }).map((_, i) => (
                    <th key={i} className="p-8 text-center min-w-[240px]">P{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.sections.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(section => {
                  const sem = state.semesters.find(s => s.id === section.semesterId);
                  return (
                    <tr key={section.id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="p-8 border-r border-slate-50 bg-white sticky left-0 z-10">
                         <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{sem?.name}</p>
                         <p className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">SEC {section.name}</p>
                      </td>
                      {Array.from({ length: state.config.totalSlots }).map((_, slotIdx) => {
                        const entry = dailySchedule.find(e => e.sectionId === section.id && e.slotIndex === slotIdx);
                        const isLunch = sem?.lunchEnabled && sem?.lunchSlotIndex === slotIdx;
                        const faculty = entry?.facultyId ? state.faculty.find(f => f.id === entry.facultyId) : null;
                        const subject = entry?.subjectId ? state.subjects.find(s => s.id === entry.subjectId) : null;

                        // Master schedule cross-reference for absence detection
                        const masterEntry = state.masterTimetable.find(e => e.sectionId === section.id && e.day === dateDay && e.slotIndex === slotIdx);
                        const masterFaculty = masterEntry?.facultyId ? state.faculty.find(f => f.id === masterEntry.facultyId) : null;
                        const isMasterFacultyAbsent = masterFaculty ? currentAvailabilities.find(a => a.facultyId === masterFaculty.id)?.status === 'Absent' : false;

                        if (isLunch) return (
                          <td key={slotIdx} className="p-3">
                             <div className="h-28 border-2 border-dashed border-amber-100 bg-amber-50/5 rounded-[32px] flex items-center justify-center text-amber-200 opacity-40">
                               <Coffee size={24} />
                             </div>
                          </td>
                        );

                        return (
                          <td key={slotIdx} className="p-3">
                            {entry ? (
                              <div className={`p-4 rounded-3xl border transition-all relative group h-28 flex flex-col justify-center ${
                                entry.entryType === 'substitution' ? 'bg-amber-50 border-amber-200' : 
                                entry.entryType === 'workshop' ? 'bg-purple-50 border-purple-200' :
                                'bg-white border-slate-100 shadow-sm'
                              }`}>
                                <button onClick={() => setState(prev => ({
                                  ...prev,
                                  dailyAdjustments: {
                                    ...prev.dailyAdjustments,
                                    [selectedDate]: (prev.dailyAdjustments[selectedDate] || []).filter(e => e.id !== entry.id)
                                  }
                                }))} className="absolute top-3 right-3 p-1.5 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all z-20 shadow-lg"><Trash2 size={12}/></button>
                                <p className="text-[9px] font-black text-blue-500 uppercase mb-1">{subject?.code || entry.entryType?.toUpperCase() || 'EVENT'}</p>
                                <h4 className="text-xs font-black text-slate-900 truncate uppercase mb-2 italic">{subject?.name || entry.title}</h4>
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100/50">
                                   <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[8px] font-black ${entry.entryType === 'substitution' ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white'}`}><User size={10}/></div>
                                   <p className="text-[10px] font-bold text-slate-500 uppercase truncate">{faculty?.name || 'Vacant'}</p>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setAssigningSlot({ sectionId: section.id, slotIdx })} 
                                className={`w-full h-28 border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center transition-all group/plus ${
                                  isMasterFacultyAbsent ? 'border-red-400 bg-red-50 text-red-600 shadow-md animate-pulse' : 'border-slate-100 text-slate-300 hover:border-blue-400 hover:bg-blue-50'
                                }`}
                              >
                                {isMasterFacultyAbsent ? (
                                  <>
                                    <AlertCircle size={24} />
                                    <span className="text-[9px] font-black uppercase mt-2 tracking-tighter">CRITICAL: ABSENT</span>
                                    <span className="text-[7px] font-bold opacity-70 uppercase tracking-widest mt-1">({masterFaculty?.name})</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus size={24}/>
                                    <span className="text-[8px] font-black uppercase mt-2 tracking-widest">Assign Slot</span>
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {assigningSlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-[#0a1a3a] italic tracking-tight uppercase">Daily Entry Engine</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Substitution or Event for P{assigningSlot.slotIdx + 1}</p>
              </div>
              <button onClick={closeAssignModal} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all"><X size={24}/></button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
               <div className="flex bg-slate-100 p-1 rounded-2xl">
                 <button onClick={() => setManualEntryMode('sub')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${manualEntryMode === 'sub' ? 'bg-white text-[#0a1a3a] shadow-sm' : 'text-slate-400'}`}>Substitution</button>
                 <button onClick={() => setManualEntryMode('workshop')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${manualEntryMode === 'workshop' ? 'bg-white text-[#0a1a3a] shadow-sm' : 'text-slate-400'}`}>Workshop</button>
                 <button onClick={() => setManualEntryMode('lunch')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${manualEntryMode === 'lunch' ? 'bg-white text-[#0a1a3a] shadow-sm' : 'text-slate-400'}`}>Special Lunch</button>
               </div>

               {manualEntryMode === 'sub' ? (
                 <div className="space-y-4">
                    {substitutionCandidates.map(({ faculty, isBusy, busyReason, load, rank, schedule }) => (
                      <div key={faculty.id} className={`p-5 rounded-[32px] border transition-all ${isBusy ? 'bg-red-50/50 border-red-100' : 'bg-white border-slate-100 shadow-sm hover:border-[#0a1a3a]'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${isBusy ? 'bg-red-500 text-white' : 'bg-blue-50 text-blue-600'}`}>{faculty.name.charAt(0)}</div>
                             <div className="text-left">
                                <p className={`font-black text-sm uppercase ${isBusy ? 'text-red-700' : 'text-slate-800'}`}>{faculty.name}</p>
                                <div className="flex items-center gap-3 mt-1">
                                   <span className="text-[9px] font-black uppercase text-slate-400">DAILY LOAD: {load}/3</span>
                                   {isBusy && <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter flex items-center gap-1"><AlertTriangle size={10}/> {busyReason}</span>}
                                </div>
                             </div>
                          </div>
                          {!isBusy && (
                            <button onClick={() => executeDailyEntry('substitution', faculty.id)} className="px-6 py-2.5 bg-[#0a1a3a] text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-md active:scale-95">Assign</button>
                          )}
                        </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="space-y-6">
                    {manualEntryMode === 'workshop' && (
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Workshop Title</label>
                        <input type="text" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="e.g. AI WORKSHOP BY MS" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
                      </div>
                    )}
                    {manualEntryMode === 'lunch' && (
                       <div className="p-6 bg-amber-50 rounded-[32px] border border-amber-100 text-center">
                          <Coffee size={32} className="mx-auto mb-4 text-amber-400" />
                          <p className="text-xs font-bold text-amber-700 uppercase">Override slot as an institutional lunch break</p>
                       </div>
                    )}
                    <button 
                      disabled={manualEntryMode === 'workshop' && !eventTitle}
                      onClick={() => executeDailyEntry(manualEntryMode === 'workshop' ? 'workshop' : 'lunch', undefined, eventTitle || 'LUNCH')}
                      className="w-full py-4 bg-[#0a1a3a] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-30"
                    >
                      Confirm Daily Entry
                    </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyAdjustments;
