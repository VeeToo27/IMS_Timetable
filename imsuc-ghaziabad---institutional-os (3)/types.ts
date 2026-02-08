
export enum Day {
  Monday = 'Monday',
  Tuesday = 'Tuesday',
  Wednesday = 'Wednesday',
  Thursday = 'Thursday',
  Friday = 'Friday',
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  weeklyFrequency: number;
}

export interface Faculty {
  id: string;
  name: string;
  subjects: string[]; // Subject IDs
  department: string;
  status: 'Present' | 'Absent';
  workloadLimit: number;
}

export type FacultyAvailabilityStatus = 'available' | 'absent' | 'slot-unavailable';

export interface DailyAvailability {
  facultyId: string;
  date: string;
  status: 'Present' | 'Absent';
  unavailableSlots: number[]; // Slot indices where faculty is gone (workshop, etc.)
}

export interface Assignment {
  id: string;
  sectionId: string;
  subjectId: string;
  facultyId: string;
}

export interface Section {
  id: string;
  name: string;
  semesterId: string;
}

export interface Semester {
  id: string;
  name: string;
  lunchEnabled?: boolean;
  lunchSlotIndex?: number;
}

export type EntryType = 'lecture' | 'lunch' | 'workshop' | 'event' | 'substitution';

export interface TimetableEntry {
  id: string;
  sectionId: string;
  day: Day;
  slotIndex: number;
  facultyId?: string;
  originalFacultyId?: string; // For tracking who was supposed to be there
  subjectId?: string;
  isLocked: boolean;
  entryType?: EntryType;
  title?: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  type: 'Workshop' | 'Holiday' | 'Exam' | 'Seminar';
}

export interface AppState {
  semesters: Semester[];
  sections: Section[];
  faculty: Faculty[];
  subjects: Subject[];
  assignments: Assignment[];
  masterTimetable: TimetableEntry[];
  dailyAdjustments: Record<string, TimetableEntry[]>; // Key is date (YYYY-MM-DD)
  facultyAvailability: Record<string, DailyAvailability[]>; // Key is date
  events: Event[];
  config: {
    totalSlots: number;
  };
}
