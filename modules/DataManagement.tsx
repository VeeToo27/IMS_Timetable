
import React, { useState, useMemo, useRef } from 'react';
import { AppState, Semester, Section, Subject, Faculty, Assignment } from '../types';
import { 
  Plus, School, Users, BookOpen, Link as LinkIcon, 
  Database, X, Trash2, AlertCircle, Search, Edit3, 
  ChevronRight, Download, Upload, Info, CheckCircle2,
  Eye, ChevronLeft, MoreHorizontal, Filter, ArrowUpDown, LayoutGrid
} from 'lucide-react';

interface DataManagementProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

type TabType = 'semesters' | 'sections' | 'subjects' | 'faculty' | 'assignments';

const ITEMS_PER_PAGE = 8;

const DataManagement: React.FC<DataManagementProps> = ({ state, setState }) => {
  const [activeTab, setActiveTab] = useState<TabType>('semesters');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Modal States
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | 'view' | null>(null);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: string, name: string } | null>(null);

  // Form States
  const [formData, setFormData] = useState<any>({});

  // Filtered & Paginated Data
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    let data = [];
    switch (activeTab) {
      case 'semesters': data = state.semesters; break;
      case 'sections': data = state.sections; break;
      case 'subjects': data = state.subjects; break;
      case 'faculty': data = state.faculty; break;
      case 'assignments': data = state.assignments; break;
    }

    const result = data.filter((item: any) => {
      const name = item.name?.toLowerCase() || '';
      const code = item.code?.toLowerCase() || '';
      const dept = item.department?.toLowerCase() || '';
      
      if (activeTab === 'assignments') {
        const sub = state.subjects.find(s => s.id === item.subjectId)?.name.toLowerCase() || '';
        const fac = state.faculty.find(f => f.id === item.facultyId)?.name.toLowerCase() || '';
        const sec = state.sections.find(s => s.id === item.sectionId)?.name.toLowerCase() || '';
        return sub.includes(term) || fac.includes(term) || sec.includes(term);
      }

      if (activeTab === 'sections') {
        const semName = state.semesters.find(s => s.id === item.semesterId)?.name.toLowerCase() || '';
        return name.includes(term) || semName.includes(term);
      }

      return name.includes(term) || code.includes(term) || dept.includes(term);
    });

    return result;
  }, [activeTab, searchTerm, state]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const exportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `CHRONOS_DB_EXPORT_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.semesters && json.sections && json.faculty) {
          setState(json);
          alert("Database imported successfully!");
        } else {
          alert("Invalid data format.");
        }
      } catch (err) {
        alert("Error parsing JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const openCreateModal = () => {
    setActiveItem(null);
    setFormData(getDefaultFormData(activeTab));
    setModalMode('create');
  };

  const openViewModal = (item: any) => {
    setActiveItem(item);
    setModalMode('view');
  };

  const openEditModal = (item: any) => {
    setActiveItem(item);
    setFormData({ ...item });
    setModalMode('edit');
  };

  const openDeleteModal = (id: string, name: string, type?: TabType) => {
    setDeleteTarget({ id, name, type: type || activeTab });
    setModalMode('delete');
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveItem(null);
    setDeleteTarget(null);
    setFormData({});
  };

  const getDefaultFormData = (tab: TabType) => {
    switch (tab) {
      case 'semesters': return { name: '' };
      case 'sections': return { name: '', semesterId: state.semesters[0]?.id || '' };
      case 'subjects': return { name: '', code: '', weeklyFrequency: 4 };
      case 'faculty': return { name: '', department: 'CS', workloadLimit: 18 };
      case 'assignments': return { sectionId: '', subjectId: '', facultyId: '' };
      default: return {};
    }
  };

  const executeSave = () => {
    setState(prev => {
      const newState = { ...prev };
      const currentTabArray = (prev as any)[activeTab];
      
      if (modalMode === 'create') {
        const id = `${activeTab.charAt(0)}-${Date.now()}`;
        const newItem = { ...formData, id };
        (newState as any)[activeTab] = [...currentTabArray, newItem];
      } else if (modalMode === 'edit') {
        (newState as any)[activeTab] = currentTabArray.map((item: any) => 
          item.id === activeItem.id ? { ...formData } : item
        );
      }
      return newState;
    });
    closeModal();
  };

  const addSectionToSemester = (semesterId: string) => {
    const name = prompt("Enter section identifier (e.g. 'A'):");
    if (!name) return;
    const newSection: Section = {
      id: `sec-${Date.now()}`,
      name,
      semesterId
    };
    setState(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const { id, type } = deleteTarget;
    setState(prev => {
      let newState = { ...prev };
      if (type === 'semesters') {
        const sectionsToRemove = prev.sections.filter(s => s.semesterId === id).map(s => s.id);
        newState.semesters = prev.semesters.filter(s => s.id !== id);
        newState.sections = prev.sections.filter(s => s.semesterId !== id);
        newState.assignments = prev.assignments.filter(a => !sectionsToRemove.includes(a.sectionId));
        newState.masterTimetable = prev.masterTimetable.filter(e => !sectionsToRemove.includes(e.sectionId));
      } else if (type === 'sections') {
        newState.sections = prev.sections.filter(s => s.id !== id);
        newState.assignments = prev.assignments.filter(a => a.sectionId !== id);
        newState.masterTimetable = prev.masterTimetable.filter(e => e.sectionId !== id);
      } else if (type === 'subjects') {
        newState.subjects = prev.subjects.filter(s => s.id !== id);
        newState.assignments = prev.assignments.filter(a => a.subjectId !== id);
        newState.masterTimetable = prev.masterTimetable.filter(e => e.subjectId !== id);
      } else if (type === 'faculty') {
        newState.faculty = prev.faculty.filter(f => f.id !== id);
        newState.assignments = prev.assignments.filter(a => a.facultyId !== id);
        newState.masterTimetable = prev.masterTimetable.filter(e => e.facultyId !== id);
      } else if (type === 'assignments') {
        newState.assignments = prev.assignments.filter(a => a.id !== id);
      }
      return newState;
    });
    closeModal();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      
      <div className="w-full lg:w-72 shrink-0 space-y-4">
        <div className="bg-white p-3 rounded-[24px] border border-slate-200 shadow-sm overflow-x-auto lg:overflow-visible scrollbar-none">
          <div className="flex lg:flex-col gap-1 min-w-max lg:min-w-0">
            {[
              { id: 'semesters', label: 'Programs', icon: School, count: state.semesters.length },
              { id: 'sections', label: 'Sections', icon: LayoutGrid, count: state.sections.length },
              { id: 'subjects', label: 'Courses', icon: BookOpen, count: state.subjects.length },
              { id: 'faculty', label: 'Staff', icon: Users, count: state.faculty.length },
              { id: 'assignments', label: 'Mappings', icon: LinkIcon, count: state.assignments.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setSearchTerm(''); setCurrentPage(1); }}
                className={`flex items-center gap-3 px-6 py-4 rounded-xl transition-all flex-1 lg:flex-none ${
                  activeTab === tab.id 
                    ? 'bg-[#0a1a3a] text-white shadow-lg' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <tab.icon size={18} className={activeTab === tab.id ? 'text-white' : 'text-slate-400'} />
                <span className="text-xs font-black uppercase tracking-tight whitespace-nowrap">{tab.label}</span>
                <span className={`ml-auto text-[9px] font-black px-2 py-0.5 rounded-md ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="hidden lg:block bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-3">
           <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Global Controls</h4>
           <button onClick={exportData} className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100 group">
             <Download size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
             <span className="text-[10px] font-black uppercase">Export DB</span>
           </button>
           <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-600 transition-all border border-slate-100 group">
             <Upload size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
             <span className="text-[10px] font-black uppercase">Import DB</span>
           </button>
           <input type="file" ref={fileInputRef} onChange={importData} className="hidden" accept=".json" />
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-6">
        
        <div className="bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" 
              placeholder={`Quick find ${activeTab}...`} 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-400 transition-all"
            />
          </div>
          <button 
            onClick={openCreateModal}
            className="w-full md:w-auto px-6 py-3 bg-[#0a1a3a] text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-blue-900 transition-all shadow-md active:scale-95"
          >
            <Plus size={16} /> Add {activeTab.slice(0, -1)}
          </button>
        </div>

        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr className="text-left">
                  <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descriptor</th>
                  <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Properties</th>
                  <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Action Grid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                          activeTab === 'semesters' ? 'bg-blue-50 text-blue-600' :
                          activeTab === 'sections' ? 'bg-indigo-50 text-indigo-600' :
                          activeTab === 'subjects' ? 'bg-amber-50 text-amber-600' :
                          activeTab === 'faculty' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'
                        }`}>
                          {(item.name || item.code || '?').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 tracking-tight truncate uppercase">{item.name || item.code}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">ID: {item.id}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-5 hidden sm:table-cell">
                      {activeTab === 'subjects' && (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase">{item.code}</span>
                          <span className="text-[10px] font-bold text-slate-500">{item.weeklyFrequency} Slots/Week</span>
                        </div>
                      )}
                      {activeTab === 'faculty' && (
                        <div className="flex flex-col">
                           <p className="text-[10px] font-bold text-slate-600 uppercase">{item.department}</p>
                           <p className="text-[8px] font-black text-slate-400 mt-0.5 uppercase">LOAD LIMIT: {item.workloadLimit}</p>
                        </div>
                      )}
                      {activeTab === 'semesters' && (
                        <div className="flex flex-wrap gap-1">
                          <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600">
                            {state.sections.filter(s => s.semesterId === item.id).length} Sections
                          </span>
                        </div>
                      )}
                      {activeTab === 'sections' && (
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-slate-500 uppercase">PROGRAM:</span>
                           <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase">
                             {state.semesters.find(s => s.id === item.semesterId)?.name || 'UNLINKED'}
                           </span>
                        </div>
                      )}
                      {activeTab === 'assignments' && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                           <span className="text-blue-500 uppercase">{state.subjects.find(s => s.id === item.subjectId)?.name}</span>
                           <ChevronRight size={10} className="text-slate-300" />
                           <span className="uppercase">{state.faculty.find(f => f.id === item.facultyId)?.name}</span>
                        </div>
                      )}
                    </td>

                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button 
                          onClick={() => openViewModal(item)}
                          className="p-2.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={() => openEditModal(item)}
                          className="p-2.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white transition-all"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(item.id, item.name || item.code)}
                          className="p-2.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-20">
                        <Database size={40} />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">No records in this scope</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Page {currentPage} of {totalPages}</p>
              <div className="flex gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-[#0a1a3a] disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-[#0a1a3a] disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">
                  {modalMode === 'create' ? `Add ${activeTab.slice(0, -1)}` : 'Edit Record'}
                </h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Institutional OS Data Map</p>
              </div>
              <button onClick={closeModal} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {activeTab === 'semesters' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Program Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-blue-400" placeholder="e.g. BCA 1" />
                  </div>
                </div>
              )}

              {activeTab === 'sections' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Section Identifier</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" placeholder="e.g. A" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Parent Program</label>
                    <select value={formData.semesterId} onChange={e => setFormData({ ...formData, semesterId: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none">
                      {state.semesters.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'subjects' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Course Title</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" placeholder="Database Systems" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Code</label>
                      <input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" placeholder="BCA301" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Freq/Week</label>
                      <input type="number" value={formData.weeklyFrequency} onChange={e => setFormData({ ...formData, weeklyFrequency: parseInt(e.target.value) })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'faculty' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Faculty Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" placeholder="PROF. DR. MISHRA" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Department</label>
                      <input type="text" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" placeholder="CS / IT" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Max Workload</label>
                      <input type="number" value={formData.workloadLimit} onChange={e => setFormData({ ...formData, workloadLimit: parseInt(e.target.value) })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'assignments' && (
                <div className="space-y-4">
                   <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Target Section</label>
                    <select value={formData.sectionId} onChange={e => setFormData({ ...formData, sectionId: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none">
                      <option value="">Choose Section...</option>
                      {state.sections.map(s => <option value={s.id} key={s.id}>
                        {state.semesters.find(sem => sem.id === s.semesterId)?.name} - SEC {s.name}
                      </option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Course</label>
                    <select value={formData.subjectId} onChange={e => setFormData({ ...formData, subjectId: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none">
                      <option value="">Choose Subject...</option>
                      {state.subjects.map(s => <option value={s.id} key={s.id}>{s.name} ({s.code})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Faculty</label>
                    <select value={formData.facultyId} onChange={e => setFormData({ ...formData, facultyId: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none">
                      <option value="">Choose Staff...</option>
                      {state.faculty.map(f => <option value={f.id} key={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-6 flex gap-3">
                 <button onClick={closeModal} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-wider">Discard</button>
                 <button onClick={executeSave} className="flex-1 py-4 bg-[#0a1a3a] text-white rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-blue-900/10 active:scale-95 transition-all">
                   Save Record
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalMode === 'view' && activeItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg border border-slate-200 p-8 space-y-8 overflow-hidden">
            <div className="flex justify-between items-start">
               <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-[24px] bg-[#0a1a3a] text-white flex items-center justify-center text-2xl font-black">
                    {(activeItem.name || activeItem.code || '?').charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">{activeItem.name || activeItem.code}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{activeTab.slice(0, -1)} Intelligence</p>
                  </div>
               </div>
               <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-300 hover:text-slate-600"><X size={24} /></button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
              <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                 {Object.entries(activeItem).map(([key, value]) => {
                   if (key === 'id' || key === 'name') return null;
                   return (
                     <div key={key} className="space-y-1">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</p>
                       <p className="text-xs font-bold text-slate-700 break-words">{String(value)}</p>
                     </div>
                   );
                 })}
              </div>

              {activeTab === 'semesters' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linked Sections</h4>
                    <button onClick={() => addSectionToSemester(activeItem.id)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all">
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {state.sections.filter(s => s.semesterId === activeItem.id).map(sec => (
                      <div key={sec.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-400 transition-all group">
                        <div className="flex items-center gap-3">
                          <LayoutGrid size={16} className="text-indigo-400" />
                          <p className="text-xs font-black text-slate-800 uppercase italic">Section {sec.name}</p>
                        </div>
                        <button onClick={() => openDeleteModal(sec.id, sec.name, 'sections')} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {state.sections.filter(s => s.semesterId === activeItem.id).length === 0 && (
                      <p className="text-[10px] font-bold text-slate-300 italic text-center py-4 uppercase">No sections mapped yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
               <button onClick={() => openEditModal(activeItem)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                 <Edit3 size={14} /> Modify
               </button>
               <button onClick={closeModal} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                 Dismiss
               </button>
            </div>
          </div>
        </div>
      )}

      {modalMode === 'delete' && deleteTarget && (
        <div className="fixed inset-0 bg-red-950/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm p-10 text-center space-y-6 animate-in zoom-in-90 duration-200">
             <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
               <AlertCircle size={40} />
             </div>
             <div className="space-y-2">
               <h3 className="text-2xl font-black text-slate-900 uppercase italic">Confirm Wipe</h3>
               <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase">
                 You are removing <span className="text-red-500">"{deleteTarget.name}"</span>. 
                 This will cascade delete all linked dependencies in the master schedule and mappings.
               </p>
             </div>
             <div className="flex flex-col gap-3">
               <button onClick={confirmDelete} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all">Destroy Permanent</button>
               <button onClick={closeModal} className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest">Abort Action</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DataManagement;
