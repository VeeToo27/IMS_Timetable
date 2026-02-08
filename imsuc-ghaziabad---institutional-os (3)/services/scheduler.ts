
import { AppState, TimetableEntry, Day, Assignment, Subject, Faculty } from '../types';
import { DAYS } from '../constants';

/**
 * PRIORITY-DRIVEN GRID SCHEDULING ALGORITHM v10.2
 * 
 * CORE LOGIC:
 * 1. Lunch is PRE-ALLOCATED based on Semester configuration.
 * 2. P1-P3 are MANDATORY. They must never be empty (unless lunch).
 * 3. Teacher Max Load: 3 per day.
 * 4. No 3-Consecutive lectures for any teacher.
 * 5. Respects SEMESTER (Class-wise) lunch configurations.
 */

interface SubjectCandidate {
  assignmentId: string;
  sectionId: string;
  subjectId: string;
  facultyId: string;
  remainingFrequency: number;
  totalScheduled: number;
}

export const generateTimetable = (state: AppState): TimetableEntry[] => {
  const { totalSlots } = state.config;
  const sections = state.sections;
  const assignments = state.assignments;
  const subjects = state.subjects;
  const semesters = state.semesters;

  // STEP 1: INITIALIZE GRIDS
  const sectionGrids: Record<string, Record<Day, (TimetableEntry | null)[]>> = {};
  const teacherGlobalGrid: Record<string, Set<string>> = {}; 
  const teacherDailyLoad: Record<string, Record<string, number>> = {};

  sections.forEach(sec => {
    sectionGrids[sec.id] = {} as any;
    DAYS.forEach(day => {
      sectionGrids[sec.id][day] = new Array(totalSlots).fill(null);
    });
  });

  DAYS.forEach(day => {
    teacherDailyLoad[day] = {};
    for (let i = 0; i < totalSlots; i++) {
      teacherGlobalGrid[`${day}-${i}`] = new Set();
    }
  });

  // STEP 2: PRE-FILL LUNCH (Institutional Priority)
  sections.forEach(sec => {
    const sem = semesters.find(s => s.id === sec.semesterId);
    if (sem?.lunchEnabled && sem.lunchSlotIndex !== undefined && sem.lunchSlotIndex < totalSlots) {
      DAYS.forEach(day => {
        sectionGrids[sec.id][day][sem.lunchSlotIndex!] = {
          id: `lunch-${sec.id}-${day}`,
          sectionId: sec.id,
          day,
          slotIndex: sem.lunchSlotIndex!,
          isLocked: true,
          entryType: 'lunch',
          title: 'LUNCH'
        };
      });
    }
  });

  // STEP 3: PRE-FILL: Preserve Locked Academic Entries
  state.masterTimetable.forEach(entry => {
    if (entry.isLocked && entry.slotIndex < totalSlots && entry.entryType !== 'lunch') {
      const grid = sectionGrids[entry.sectionId];
      if (grid && grid[entry.day][entry.slotIndex] === null) {
        grid[entry.day][entry.slotIndex] = entry;
        if (entry.facultyId) {
          teacherGlobalGrid[`${entry.day}-${entry.slotIndex}`].add(entry.facultyId);
          teacherDailyLoad[entry.day][entry.facultyId] = (teacherDailyLoad[entry.day][entry.facultyId] || 0) + 1;
        }
      }
    }
  });

  // STEP 4: BUILD CANDIDATE POOL
  const candidates: SubjectCandidate[] = assignments.map(asg => {
    const sub = subjects.find(s => s.id === asg.subjectId);
    const alreadyScheduled = state.masterTimetable.filter(
      e => e.isLocked && e.sectionId === asg.sectionId && e.subjectId === asg.subjectId
    ).length;
    return {
      assignmentId: asg.id,
      sectionId: asg.sectionId,
      subjectId: asg.subjectId,
      facultyId: asg.facultyId,
      remainingFrequency: (sub?.weeklyFrequency || 0) - alreadyScheduled,
      totalScheduled: alreadyScheduled
    };
  });

  const checkConsecutive = (facultyId: string, day: Day, slotIdx: number) => {
    let consecutiveCount = 1;
    for (let i = slotIdx - 1; i >= 0; i--) {
      if (teacherGlobalGrid[`${day}-${i}`].has(facultyId)) consecutiveCount++;
      else break;
    }
    for (let i = slotIdx + 1; i < totalSlots; i++) {
      if (teacherGlobalGrid[`${day}-${i}`].has(facultyId)) consecutiveCount++;
      else break;
    }
    return consecutiveCount >= 3;
  };

  const findBestCandidate = (sectionId: string, day: Day, slotIdx: number, forceFill: boolean, limitLoad: number) => {
    const sectionCandidates = candidates.filter(c => c.sectionId === sectionId);
    
    const sorted = sectionCandidates.sort((a, b) => {
      if (a.remainingFrequency !== b.remainingFrequency) return b.remainingFrequency - a.remainingFrequency;
      const loadA = teacherDailyLoad[day][a.facultyId] || 0;
      const loadB = teacherDailyLoad[day][b.facultyId] || 0;
      return loadA - loadB;
    });

    for (const cand of sorted) {
      if (teacherGlobalGrid[`${day}-${slotIdx}`].has(cand.facultyId)) continue;
      if ((teacherDailyLoad[day][cand.facultyId] || 0) >= limitLoad) continue;
      if (checkConsecutive(cand.facultyId, day, slotIdx)) continue;
      if (sectionGrids[sectionId][day].some(e => e?.subjectId === cand.subjectId)) continue;

      if (!forceFill && cand.remainingFrequency <= 0) continue;

      return cand;
    }
    return null;
  };

  // STEP 5: MANDATORY MORNING FILLING (P1-P3)
  for (let slotIdx = 0; slotIdx < 3; slotIdx++) {
    DAYS.forEach(day => {
      sections.forEach(sec => {
        if (sectionGrids[sec.id][day][slotIdx] !== null) return; 

        let match = findBestCandidate(sec.id, day, slotIdx, false, 3);
        if (!match) match = findBestCandidate(sec.id, day, slotIdx, true, 4); 

        if (match) {
          const entry: TimetableEntry = {
            id: `auto-morn-${Math.random().toString(36).substr(2, 9)}`,
            sectionId: sec.id,
            day,
            slotIndex: slotIdx,
            facultyId: match.facultyId,
            subjectId: match.subjectId,
            isLocked: false,
            entryType: 'lecture'
          };
          sectionGrids[sec.id][day][slotIdx] = entry;
          teacherGlobalGrid[`${day}-${slotIdx}`].add(match.facultyId);
          teacherDailyLoad[day][match.facultyId] = (teacherDailyLoad[day][match.facultyId] || 0) + 1;
          match.remainingFrequency--;
          match.totalScheduled++;
        }
      });
    });
  }

  // STEP 6: FREQUENCY ADJUSTMENT PHASE (Remaining Slots)
  for (let slotIdx = 0; slotIdx < totalSlots; slotIdx++) {
    DAYS.forEach(day => {
      sections.forEach(sec => {
        if (sectionGrids[sec.id][day][slotIdx] !== null) return;

        const match = findBestCandidate(sec.id, day, slotIdx, false, 3);
        if (match) {
          const entry: TimetableEntry = {
            id: `auto-flex-${Math.random().toString(36).substr(2, 9)}`,
            sectionId: sec.id,
            day,
            slotIndex: slotIdx,
            facultyId: match.facultyId,
            subjectId: match.subjectId,
            isLocked: false,
            entryType: 'lecture'
          };
          sectionGrids[sec.id][day][slotIdx] = entry;
          teacherGlobalGrid[`${day}-${slotIdx}`].add(match.facultyId);
          teacherDailyLoad[day][match.facultyId] = (teacherDailyLoad[day][match.facultyId] || 0) + 1;
          match.remainingFrequency--;
          match.totalScheduled++;
        }
      });
    });
  }

  const finalTimetable: TimetableEntry[] = [];
  Object.values(sectionGrids).forEach(dayMap => {
    Object.values(dayMap).forEach(slots => {
      slots.forEach(entry => { if (entry) finalTimetable.push(entry); });
    });
  });

  return finalTimetable;
};

export const detectAllConflicts = (entries: TimetableEntry[], state: AppState, date?: string): ConflictResult => {
  const hard: string[] = [];
  const warnings: string[] = [];
  const { totalSlots } = state.config;

  DAYS.forEach(day => {
    for (let i = 0; i < totalSlots; i++) {
      const slotEntries = entries.filter(e => e.day === day && e.slotIndex === i && e.facultyId);
      const facultyMap: Record<string, string[]> = {};
      slotEntries.forEach(e => {
        if (!facultyMap[e.facultyId!]) facultyMap[e.facultyId!] = [];
        const secName = state.sections.find(s => s.id === e.sectionId)?.name || '?';
        const semName = state.semesters.find(sem => sem.id === state.sections.find(s => s.id === e.sectionId)?.semesterId)?.name || '?';
        facultyMap[e.facultyId!].push(`${semName}-${secName}`);
      });
      Object.entries(facultyMap).forEach(([fId, secs]) => {
        if (secs.length > 1) {
          const fName = state.faculty.find(f => f.id === fId)?.name || fId;
          hard.push(`${fName} CLASH on ${day} P${i+1} in: ${secs.join(', ')}`);
        }
      });
    }
  });

  state.sections.forEach(sec => {
    const sem = state.semesters.find(s => s.id === sec.semesterId);
    DAYS.forEach(day => {
      for (let i = 0; i < 3; i++) {
        if (sem?.lunchEnabled && sem?.lunchSlotIndex === i) continue;
        const entry = entries.find(e => e.sectionId === sec.id && e.day === day && e.slotIndex === i);
        if (!entry) {
          const hasLater = entries.some(e => e.sectionId === sec.id && e.day === day && e.slotIndex > i && e.entryType !== 'lunch');
          if (hasLater) hard.push(`${sem?.name}-${sec.name}: Mandatory Morning P${i+1} is Empty`);
        }
      }
    });
  });

  DAYS.forEach(day => {
    state.faculty.forEach(f => {
      const dayClasses = entries.filter(e => e.day === day && e.facultyId === f.id).sort((a,b) => a.slotIndex - b.slotIndex);
      if (dayClasses.length > 3) warnings.push(`${f.name}: Excessive load (${dayClasses.length}/3) on ${day}`);
      for (let i = 0; i < dayClasses.length - 2; i++) {
        if (dayClasses[i+1].slotIndex === dayClasses[i].slotIndex + 1 && 
            dayClasses[i+2].slotIndex === dayClasses[i+1].slotIndex + 1) {
          hard.push(`${f.name}: 3 Consecutive Lectures on ${day}`);
        }
      }
    });
  });

  return { hard, warnings };
};

export const cloneMasterToDaily = (date: string, day: Day, state: AppState): TimetableEntry[] => {
  const masterForDay = state.masterTimetable.filter(e => e.day === day);
  return masterForDay.map(m => ({
    ...m,
    id: `daily-${date}-${m.id}`,
    originalFacultyId: m.facultyId,
  }));
};

export interface ConflictResult {
  hard: string[];
  warnings: string[];
}
