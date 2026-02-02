// Bulgarian Work Schedule Types

export interface Shift {
  id: string;
  name: string;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  hours: number;     // Calculated from start/end
}

export interface FirmSettings {
  firmName: string;
  ownerName: string;
  operatingHoursStart: string; // HH:mm
  operatingHoursEnd: string;   // HH:mm
  worksOnHolidays: boolean;
  shifts: Shift[];
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  egn: string;          // 10-digit Bulgarian ID
  position: string;
  contractHours: 2 | 4 | 6 | 7 | 8;
  isMinor: boolean;     // Calculated from EGN
  birthDate: Date;      // Extracted from EGN
}

export type ScheduleEntryType = 'shift' | 'rest' | 'holiday';

export interface ScheduleEntry {
  type: ScheduleEntryType;
  shiftId?: string;      // Only if type === 'shift'
  shiftName?: string;    // Display name
  hours?: number;        // Hours worked
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

export interface MonthSchedule {
  month: number;         // 1-12
  year: number;
  employeeSchedules: EmployeeSchedule[];
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
