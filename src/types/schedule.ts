// Bulgarian Work Schedule Types

export interface Shift {
  id: string;
  name: string;
  abbreviation: string; // Short code for display (e.g., "С", "В")
  startTime: string;    // HH:mm
  endTime: string;      // HH:mm
  breakMinutes: number; // Break duration in minutes
}

export interface Position {
  id: string;
  name: string;
  minPerDay: number; // Minimum employees needed per day for this position
}

export interface FirmSettings {
  firmName: string;
  ownerName: string;
  operatingHoursStart: string; // HH:mm
  operatingHoursEnd: string;   // HH:mm
  worksOnHolidays: boolean;
  operatingDays: number[];     // Days of week firm operates (0=Sunday, 1=Monday, ..., 6=Saturday)
  positions: Position[];
  shifts: Shift[];
}

export type IdType = 'egn' | 'lnch' | 'other';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  egn: string;          // ID number (EGN, ЛНЧ, or other)
  idType: IdType;       // Type of ID document
  positionId: string;   // Reference to Position
  contractHours: 2 | 4 | 6 | 7 | 8 | 10 | 12;
  isMinor: boolean;     // Calculated from birth date
  birthDate: Date;      // Extracted from EGN/ЛНЧ or entered manually
}

export type ScheduleEntryType = 'work' | 'rest' | 'holiday';

export interface ScheduleEntry {
  type: ScheduleEntryType;
  hours?: number;        // Actual hours worked (from shift duration)
  shiftId?: string;      // Which shift assigned (only for 'work' type)
  contractHours?: number; // Original contract hours
  overtimeHours?: number; // Hours beyond contract (shift hours - contract hours)
}

export interface EmployeeSchedule {
  employeeId: string;
  entries: Record<number, ScheduleEntry>; // day of month -> entry
  totalHours: number;
  totalRestDays: number;
  totalWorkDays: number;
  isCompliant: boolean;
  complianceIssues: string[];
}

export interface CoverageGap {
  day: number;
  positionId: string;
  positionName: string;
  required: number;
  actual: number;
}

export interface MonthSchedule {
  month: number;         // 1-12
  year: number;
  employeeSchedules: EmployeeSchedule[];
  coverageGaps: CoverageGap[];  // Days where positions are understaffed
  generatedAt: Date;
}

export interface MonthlyCalendarData {
  workingDays: number;
  workingHours: number;
  holidays: number[];    // Day numbers that are holidays
}

export interface BulgarianCalendar {
  year: number;
  months: Record<number, MonthlyCalendarData>; // 1-12
  allHolidays: Date[];   // All holiday dates
}
