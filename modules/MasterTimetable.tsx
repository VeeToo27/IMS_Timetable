
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, Day, TimetableEntry, EntryType, Section, Subject, Faculty } from '../types';
import { DAYS } from '../constants';
import { generateTimetable, detectAllConflicts, ConflictResult } from '../services/scheduler';
import { 
  RefreshCw, Download, Plus, Minus, Coffee, X, 
  Trash2, ShieldAlert, ShieldCheck, ChevronDown,
  Settings2, Clock, Lock, Unlock, AlertTriangle, Info,
  BookOpen, Zap, Search, CheckCircle2, SlidersHorizontal
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface MasterTimetableProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const MasterTimetable: React.FC<MasterTimetableProps> = ({ state, setState }) => {
  const [selectedSemesterId, setSelectedSemesterId] = useState(state.semesters[0]?.id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictResult>({ hard: [], warnings: [] });
  const [showConflictPanel, setShowConflictPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Manual Assignment Modal State
  const [assigningSlot, setAssigningSlot] = useState<{ sectionId: string, day: Day, slotIdx: number } | null>(null);
  const [manualEntryMode, setManualEntryMode] = useState<EntryType>('lecture');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [facultySearch, setFacultySearch] = useState('');

  const filteredSections = state.sections.filter(s => s.semesterId === selectedSemesterId);
  
  useEffect(() => {
    setConflicts(detectAllConflicts(state.masterTimetable, state));
  }, [state.masterTimetable, state.assignments, state.sections, state.semesters]);

  const handleAutoGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const generated = generateTimetable(state);
      setState(prev => ({ ...prev, masterTimetable: generated }));
      setIsGenerating(false);
      setShowConflictPanel(true);
    }, 1200);
  };

  const toggleLock = (entryId: string) => {
    setState(prev => ({
      ...prev,
      masterTimetable: prev.masterTimetable.map(e => e.id === entryId ? {...e, isLocked: !e.isLocked} : e)
    }));
  };

  const removeEntry = (id: string, e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setState(prev => ({
      ...prev,
      masterTimetable: prev.masterTimetable.filter(e => e.id !== id)
    }));
  };

  const updateSemesterLunch = (semesterId: string, enabled: boolean, slot?: number) => {
    setState(prev => ({
      ...prev,
      semesters: prev.semesters.map(s => 
        s.id === semesterId ? { ...s, lunchEnabled: enabled, lunchSlotIndex: slot ?? s.lunchSlotIndex } : s
      )
    }));
  };

  const updateGlobalSlots = (delta: number) => {
    setState(prev => {
      const newTotal = Math.max(1, prev.config.totalSlots + delta);
      return {
        ...prev,
        config: { ...prev.config, totalSlots: newTotal },
        masterTimetable: prev.masterTimetable.filter(e => e.slotIndex < newTotal)
      };
    });
  };

  const handleManualAssign = () => {
    if (!assigningSlot) return;

    const newEntry: TimetableEntry = {
      id: `manual-${Date.now()}`,
      sectionId: assigningSlot.sectionId,
      day: assigningSlot.day,
      slotIndex: assigningSlot.slotIdx,
      isLocked: true,
      entryType: manualEntryMode,
      title: manualEntryMode !== 'lecture' ? eventTitle : undefined,
      subjectId: manualEntryMode === 'lecture' ? selectedSubjectId : undefined,
      facultyId: selectedFacultyId || undefined
    };

    setState(prev => ({
      ...prev,
      masterTimetable: [
        ...prev.masterTimetable.filter(e => !(e.sectionId === assigningSlot.sectionId && e.day === assigningSlot.day && e.slotIndex === assigningSlot.slotIdx)),
        newEntry
      ]
    }));

    closeAssignModal();
  };

  const closeAssignModal = () => {
    setAssigningSlot(null);
    setSelectedSubjectId('');
    setSelectedFacultyId('');
    setEventTitle('');
    setFacultySearch('');
  };

  const getFacultyClashInfo = (fId: string, day: Day, slotIdx: number) => {
    const clash = state.masterTimetable.find(e => e.facultyId === fId && e.day === day && e.slotIndex === slotIdx);
    if (!clash) return null;
    const sec = state.sections.find(s => s.id === clash.sectionId);
    const sem = state.semesters.find(s => s.id === sec?.semesterId);
    return sec ? `Busy: ${sem?.name}-${sec.name}` : 'Busy';
  };

  const getFacultyDayLoad = (fId: string, day: Day) => {
    return state.masterTimetable.filter(e => e.facultyId === fId && e.day === day).length;
  };

  const facultyList = useMemo(() => {
    if (!assigningSlot) return [];
    return state.faculty
      .filter(f => f.name.toLowerCase().includes(facultySearch.toLowerCase()))
      .map(f => ({
        ...f,
        clash: getFacultyClashInfo(f.id, assigningSlot.day, assigningSlot.slotIdx),
        load: getFacultyDayLoad(f.id, assigningSlot.day)
      }))
      .sort((a, b) => {
        if (a.clash && !b.clash) return 1;
        if (!a.clash && b.clash) return -1;
        return a.load - b.load;
      });
  }, [state.faculty, state.masterTimetable, assigningSlot, facultySearch]);

  const canConfirmManualEntry = useMemo(() => {
    if (manualEntryMode === 'lecture') {
      return !!selectedSubjectId && !!selectedFacultyId;
    } else {
      return !!eventTitle;
    }
  }, [manualEntryMode, selectedSubjectId, selectedFacultyId, eventTitle]);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    state.semesters.forEach(semester => {
      const rows: any[] = [];
      const semesterSections = state.sections.filter(s => s.semesterId === semester.id);
      DAYS.forEach(day => {
        rows.push({ Section: day.toUpperCase() });
        semesterSections.forEach(section => {
          const sectionRow: any = { Section: section.name };
          for (let i = 0; i < state.config.totalSlots; i++) {
            const entry = state.masterTimetable.find(e => e.sectionId === section.id && e.day === day && e.slotIndex === i);
            const isLunchConfig = semester.lunchEnabled && semester.lunchSlotIndex === i;
            
            if (entry) {
              if (entry.entryType === 'lecture') {
                sectionRow[`Slot ${i + 1}`] = `${state.subjects.find(s => s.id === entry.subjectId)?.name} (${state.faculty.find(f => f.id === entry.facultyId)?.name})`;
              } else if (entry.entryType === 'lunch') {
                sectionRow[`Slot ${i + 1}`] = 'LUNCH';
              } else {
                sectionRow[`Slot ${i + 1}`] = entry.title || entry.entryType?.toUpperCase();
              }
            } else if (isLunchConfig) {
              sectionRow[`Slot ${i + 1}`] = 'LUNCH';
            } else {
              sectionRow[`Slot ${i + 1}`] = '-';
            }
          }
          rows.push(sectionRow);
        });
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), semester.name);
    });
    XLSX.writeFile(wb, "Academic_Master_Timetable.xlsx");
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto text-left">
      
      {/* Dashboard Controls */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center gap-6 w-full xl:w-auto">
            <div className="w-full md:w-72">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-1">Target Cluster</label>
              <select className="w-full h-[52px] px-6 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs text-[#0a1a3a] outline-none hover:border-[#0a1a3a] transition-all cursor-pointer shadow-inner" value={selectedSemesterId} onChange={(e) => setSelectedSemesterId(e.target.value)}>
                {state.semesters.map(sem => <option key={sem.id} value={sem.id}>{sem.name}</option>)}
              </select>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`h-[52px] px-8 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 ${showSettings ? 'bg-[#0a1a3a] text-white shadow-xl shadow-[#0a1a3a]/20' : 'bg-slate-50 text-[#0a1a3a] border-slate-200 hover:bg-white'}`}
              >
                <Settings2 size={18} /> Configuration
              </button>

              <button onClick={handleAutoGenerate} disabled={isGenerating} className={`h-[52px] px-10 bg-[#0a1a3a] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 ${isGenerating && 'animate-pulse'}`}>
                <RefreshCw size={18} className={isGenerating ? 'animate-spin' : ''}/>
                {isGenerating ? 'Solving Complexity...' : 'Generate Plan'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setShowConflictPanel(!showConflictPanel)} className={`h-[52px] px-8 rounded-2xl border transition-all flex items-center gap-6 ${conflicts.hard.length > 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-600'}`}>
               <div className="flex flex-col items-start leading-none">
                  <p className="text-[11px] font-black uppercase tracking-tight">{conflicts.hard.length > 0 ? 'Hard Clashes' : 'Grid Optimized'}</p>
                  <p className="text-[8px] font-bold opacity-60 mt-1 uppercase tracking-widest">{conflicts.hard.length} Blocks • {conflicts.warnings.length} Hints</p>
               </div>
               {conflicts.hard.length > 0 ? <ShieldAlert size={22}/> : <ShieldCheck size={22}/>}
            </button>
            <button onClick={exportToExcel} className="h-[52px] px-8 bg-slate-50 text-[#0a1a3a] rounded-2xl border border-slate-200 font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-sm"><Download size={18}/></button>
          </div>
        </div>

        {/* Settings Area */}
        {showSettings && (
          <div className="mt-8 p-10 bg-slate-50 rounded-[32px] border border-slate-100 animate-in slide-in-from-top-4 duration-300 space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Period Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-800 px-1">
                   <SlidersHorizontal size={18} className="text-[#0a1a3a]" />
                   <h4 className="text-[11px] font-black uppercase tracking-widest">Temporal Scale</h4>
                </div>
                <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Periods / Day</span>
                  <div className="flex items-center gap-6">
                    <button onClick={() => updateGlobalSlots(-1)} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"><Minus size={18}/></button>
                    <span className="font-black text-3xl text-[#0a1a3a] min-w-[2ch] text-center tracking-tighter">{state.config.totalSlots}</span>
                    <button onClick={() => updateGlobalSlots(1)} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-green-50 text-slate-400 hover:text-green-500 rounded-xl transition-all"><Plus size={18}/></button>
                  </div>
                </div>
              </div>

              {/* Lunch Configuration Redesign */}
              <div className="lg:col-span-2 space-y-4">
                 <div className="flex items-center gap-3 text-slate-800 px-1">
                    <Coffee size={18} className="text-amber-500" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest">Institutional Lunch Matrix</h4>
                 </div>
                 <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm overflow-x-auto">
                    <table className="w-full">
                       <thead>
                          <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                             <th className="pb-4 text-left w-32">Academic Program</th>
                             <th className="pb-4 text-center w-24">Status</th>
                             <th className="pb-4 text-center">Assigned Slot</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {state.semesters.map(sem => (
                             <tr key={sem.id} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 font-black text-slate-900 text-xs uppercase tracking-tight italic">{sem.name}</td>
                                <td className="py-4 text-center">
                                   <button 
                                      onClick={() => updateSemesterLunch(sem.id, !sem.lunchEnabled)}
                                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${sem.lunchEnabled ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}
                                   >
                                      {sem.lunchEnabled ? 'RESERVED' : 'DISABLED'}
                                   </button>
                                </td>
                                <td className="py-4">
                                   <div className="flex justify-center gap-1.5 flex-wrap">
                                      {Array.from({length: state.config.totalSlots}).map((_, i) => (
                                         <button 
                                            key={i}
                                            disabled={!sem.lunchEnabled}
                                            onClick={() => updateSemesterLunch(sem.id, true, i)}
                                            className={`w-10 h-8 rounded-lg text-[10px] font-black transition-all flex items-center justify-center ${
                                               !sem.lunchEnabled ? 'opacity-20 cursor-not-allowed bg-slate-50 text-slate-300' :
                                               sem.lunchSlotIndex === i ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                            }`}
                                         >
                                            P{i+1}
                                         </button>
                                      ))}
                                   </div>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
            </div>
          </div>
        )}

        {showConflictPanel && (
          <div className="mt-8 p-10 bg-slate-50 rounded-[32px] border border-slate-100 animate-in slide-in-from-top-4 duration-300">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               <div className="space-y-4">
                 <h4 className="text-[11px] font-black text-red-600 uppercase tracking-widest px-1 flex items-center gap-3"><AlertTriangle size={16}/> Critical Constraints</h4>
                 <div className="space-y-3 max-h-80 overflow-y-auto pr-3 scrollbar-thin">
                   {conflicts.hard.length === 0 ? (
                     <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                        <CheckCircle2 size={32} className="text-green-500 mx-auto mb-3" />
                        <p className="text-xs font-black text-slate-400 uppercase italic">Zero Violations Detected</p>
                     </div>
                   ) : conflicts.hard.map((c, i) => (
                     <div key={i} className="flex items-center gap-4 p-5 bg-white border border-red-100 rounded-2xl text-[11px] font-black text-red-700 shadow-sm animate-in slide-in-from-left-2">
                        <div className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center shrink-0">!</div>
                        <span className="leading-relaxed">{c}</span>
                     </div>
                   ))}
                 </div>
               </div>
               <div className="space-y-4">
                 <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-widest px-1 flex items-center gap-3"><Info size={16}/> Intelligence Suggestions</h4>
                 <div className="space-y-3 max-h-80 overflow-y-auto pr-3 scrollbar-thin">
                   {conflicts.warnings.length === 0 ? (
                     <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                        <ShieldCheck size={32} className="text-blue-500 mx-auto mb-3" />
                        <p className="text-xs font-black text-slate-400 uppercase italic">No Optimization Needed</p>
                     </div>
                   ) : conflicts.warnings.map((w, i) => (
                     <div key={i} className="flex items-center gap-4 p-5 bg-white border border-blue-100 rounded-2xl text-[11px] font-black text-blue-700 shadow-sm animate-in slide-in-from-left-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0">i</div>
                        <span className="leading-relaxed">{w}</span>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
          </div>
        )}
      </div>

      {/* Grid Display */}
      <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/80 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                <th className="p-10 w-80 sticky left-0 bg-slate-50 z-20 shadow-sm">Academic Units</th>
                {Array.from({ length: state.config.totalSlots }).map((_, i) => (
                  <th key={i} className={`p-10 text-center min-w-[260px] ${i < 3 ? 'bg-blue-50/20' : ''}`}>
                    <div className="space-y-1">
                      <span className="text-slate-900">Period {i + 1}</span>
                      <p className={`text-[9px] font-black uppercase tracking-tighter ${i < 3 ? 'text-blue-500' : 'text-slate-400'}`}>
                        {i < 3 ? 'Institutional Core' : 'Flexible Load'}
                      </p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map(day => (
                <React.Fragment key={day}>
                  <tr>
                    <td colSpan={state.config.totalSlots + 1} className="px-10 py-5 bg-[#0a1a3a] border-y border-slate-800 text-white text-[11px] font-black italic tracking-[0.4em] uppercase text-center">
                       {day} Operational Matrix
                    </td>
                  </tr>
                  {filteredSections.map(section => {
                    const sem = state.semesters.find(s => s.id === section.semesterId);
                    return (
                      <tr key={`${day}-${section.id}`} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="p-10 sticky left-0 bg-white z-10 border-r border-slate-50 font-black text-slate-900 text-3xl tracking-tighter italic uppercase leading-none shadow-sm">
                          {section.name}
                        </td>
                        {Array.from({ length: state.config.totalSlots }).map((_, slotIdx) => {
                          const entry = state.masterTimetable.find(e => e.sectionId === section.id && e.day === day && e.slotIndex === slotIdx);
                          const isLunch = (sem?.lunchEnabled && sem?.lunchSlotIndex === slotIdx) || entry?.entryType === 'lunch';
                          const subject = entry?.subjectId ? state.subjects.find(s => s.id === entry.subjectId) : null;
                          const faculty = entry?.facultyId ? state.faculty.find(f => f.id === entry.facultyId) : null;
                          const isMandatoryEmpty = slotIdx < 3 && !entry && !isLunch;

                          if (isLunch) return (
                            <td key={slotIdx} className="p-4">
                              <div className="h-32 border-2 border-dashed border-amber-100 bg-amber-50/10 rounded-[40px] flex items-center justify-center text-amber-400 transition-all group-hover:bg-amber-50/30 group-hover:scale-95">
                                <div className="flex flex-col items-center gap-3">
                                  <Coffee size={32}/>
                                  <span className="text-[9px] font-black uppercase tracking-[0.2em] italic">Dining Interval</span>
                                </div>
                              </div>
                            </td>
                          );

                          return (
                            <td key={slotIdx} className={`p-4 ${isMandatoryEmpty ? 'bg-red-50/20' : ''}`}>
                              {entry ? (
                                <div className={`p-6 rounded-[40px] border h-32 flex flex-col justify-center relative group/entry transition-all hover:shadow-2xl hover:-translate-y-1 ${entry.isLocked ? 'bg-slate-900 border-slate-800 text-white shadow-xl shadow-slate-900/10' : 'bg-white border-slate-100 shadow-sm'}`}>
                                  <div className="absolute top-5 right-5 flex gap-2 opacity-0 group-entry-hover:opacity-100 transition-all scale-90 group-entry-hover:scale-100">
                                    <button onClick={() => toggleLock(entry.id)} className={`p-2.5 rounded-xl transition-all ${entry.isLocked ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-50 text-[#0a1a3a] hover:bg-slate-100'}`}>{entry.isLocked ? <Lock size={14}/> : <Unlock size={14}/>}</button>
                                    <button onClick={() => removeEntry(entry.id)} className="p-2.5 bg-red-500 text-white rounded-xl shadow-xl shadow-red-500/20 hover:bg-red-600"><Trash2 size={14}/></button>
                                  </div>
                                  <p className={`text-[10px] font-black tracking-widest mb-1 uppercase italic ${entry.isLocked ? 'text-blue-400' : 'text-blue-500'}`}>{subject?.code || entry.entryType?.toUpperCase() || 'EVENT'}</p>
                                  <h4 className="text-sm font-black uppercase italic truncate mb-3 tracking-tight">{subject?.name || entry.title}</h4>
                                  <div className={`flex items-center gap-2.5 pt-3 border-t ${entry.isLocked ? 'border-white/10' : 'border-slate-50'}`}>
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black ${entry.isLocked ? 'bg-white/10 text-white' : 'bg-slate-900 text-white'}`}><Clock size={12}/></div>
                                    <p className={`text-[10px] font-bold uppercase truncate tracking-tight ${entry.isLocked ? 'text-slate-400' : 'text-slate-500'}`}>{faculty?.name || 'Vacant Slot'}</p>
                                  </div>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setAssigningSlot({ sectionId: section.id, day, slotIdx })}
                                  className={`w-full h-32 border-2 border-dashed rounded-[40px] transition-all flex flex-col items-center justify-center group/add ${isMandatoryEmpty ? 'border-red-200 text-red-300 hover:border-red-500 hover:bg-red-50' : 'border-slate-100 text-slate-200 hover:border-blue-400 hover:bg-blue-50/30'}`}
                                >
                                  <Plus size={32} className="group-hover/add:scale-110 transition-transform"/>
                                  <span className="text-[9px] font-black uppercase mt-3 tracking-widest">Assign Resource</span>
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Assignment Modal */}
      {assigningSlot && (
        <div className="fixed inset-0 bg-[#0a1a3a]/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-3xl font-black text-[#0a1a3a] italic tracking-tight uppercase leading-none">Resource Dispatch</h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">
                  Configuring {assigningSlot.day} • Cycle Period {assigningSlot.slotIdx + 1}
                </p>
              </div>
              <button onClick={closeAssignModal} className="p-4 hover:bg-red-50 hover:text-red-500 rounded-3xl transition-all active:scale-90"><X size={28}/></button>
            </div>

            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-thin">
              <div className="flex bg-slate-100 p-1.5 rounded-3xl">
                 <button 
                   onClick={() => setManualEntryMode('lecture')}
                   className={`flex-1 py-4 rounded-[22px] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${manualEntryMode === 'lecture' ? 'bg-white text-[#0a1a3a] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   <BookOpen size={16}/> Standard Lecture
                 </button>
                 <button 
                   onClick={() => setManualEntryMode('workshop')}
                   className={`flex-1 py-4 rounded-[22px] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${manualEntryMode !== 'lecture' ? 'bg-white text-[#0a1a3a] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   <Zap size={16}/> Institutional Event
                 </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                   {manualEntryMode === 'lecture' ? (
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Mapping Portfolio</label>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-3 scrollbar-thin">
                          {state.assignments.filter(a => a.sectionId === assigningSlot.sectionId).map(asg => {
                            const sub = state.subjects.find(s => s.id === asg.subjectId);
                            const fac = state.faculty.find(f => f.id === asg.facultyId);
                            const count = state.masterTimetable.filter(e => e.sectionId === assigningSlot.sectionId && e.subjectId === asg.subjectId).length;
                            return (
                              <button 
                                key={asg.id}
                                onClick={() => {
                                  setSelectedSubjectId(asg.subjectId);
                                  setSelectedFacultyId(asg.facultyId);
                                }}
                                className={`w-full p-6 rounded-[32px] border text-left transition-all relative group ${selectedSubjectId === asg.subjectId ? 'bg-blue-50 border-blue-500 shadow-xl scale-[1.02]' : 'bg-white border-slate-100 hover:border-blue-300'}`}
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">{sub?.code}</span>
                                  <span className="text-[9px] font-black text-slate-400 uppercase">{count} / {sub?.weeklyFrequency} HRS</span>
                                </div>
                                <p className="text-[13px] font-black text-slate-900 truncate uppercase italic tracking-tight">{sub?.name}</p>
                                <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-tight">Staff: <span className="text-[#0a1a3a]">{fac?.name}</span></p>
                              </button>
                            );
                          })}
                        </div>
                     </div>
                   ) : (
                     <div className="space-y-6">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Identifier</label>
                           <input 
                             type="text" 
                             value={eventTitle}
                             onChange={(e) => setEventTitle(e.target.value)}
                             placeholder="e.g. SEMINAR ON QUANTUM COMPUTING"
                             className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[22px] text-xs font-bold outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Protocol Type</label>
                           <select 
                             value={manualEntryMode}
                             onChange={(e) => setManualEntryMode(e.target.value as EntryType)}
                             className="w-full h-[52px] px-6 bg-slate-50 border border-slate-100 rounded-[22px] text-xs font-bold outline-none shadow-inner"
                           >
                             <option value="workshop">Workshop Series</option>
                             <option value="seminar">Institutional Seminar</option>
                             <option value="event">Campus Event</option>
                           </select>
                        </div>
                     </div>
                   )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Faculty Registry</label>
                    {manualEntryMode !== 'lecture' && <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 px-2 rounded">Optional Override</span>}
                  </div>
                  <div className="relative mb-4">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                    <input 
                      type="text" 
                      placeholder="Search roster..."
                      value={facultySearch}
                      onChange={(e) => setFacultySearch(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[22px] text-xs font-bold outline-none focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-3 scrollbar-thin">
                    {facultyList.map(f => (
                      <button 
                        key={f.id}
                        disabled={!!f.clash}
                        onClick={() => setSelectedFacultyId(selectedFacultyId === f.id ? '' : f.id)}
                        className={`w-full p-5 rounded-[28px] border text-left transition-all flex items-center justify-between group/fac ${
                          selectedFacultyId === f.id ? 'bg-[#0a1a3a] border-[#0a1a3a] text-white shadow-xl scale-[1.02]' : 
                          f.clash ? 'bg-red-50 border-red-50 opacity-40 cursor-not-allowed' : 'bg-white border-slate-100 hover:border-[#0a1a3a]'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className={`text-[12px] font-black uppercase truncate italic ${selectedFacultyId === f.id ? 'text-white' : 'text-slate-800'}`}>{f.name}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${selectedFacultyId === f.id ? 'text-blue-300' : 'text-slate-400'}`}>LOAD: {f.load}/3</span>
                            {f.clash && <span className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1"><AlertTriangle size={10}/> {f.clash}</span>}
                          </div>
                        </div>
                        {selectedFacultyId === f.id ? <CheckCircle2 size={20} className="text-white"/> : null}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-6">
               <button onClick={closeAssignModal} className="flex-1 py-5 bg-white border border-slate-200 text-slate-500 rounded-[28px] font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm">Discard Entry</button>
               <button 
                 disabled={!canConfirmManualEntry}
                 onClick={handleManualAssign} 
                 className="flex-1 py-5 bg-[#0a1a3a] text-white rounded-[28px] font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-blue-900/20 active:scale-95 disabled:opacity-30 transition-all"
               >
                 Confirm Dispatch
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterTimetable;
