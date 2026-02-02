// Bulgarian Work Schedule Types

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
  positions: Position[];
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  egn: string;          // 10-digit Bulgarian ID
  positionId: string;   // Reference to Position
  contractHours: 2 | 4 | 6 | 7 | 8;
  isMinor: boolean;     // Calculated from EGN
  birthDate: Date;      // Extracted from EGN
}

export type ScheduleEntryType = 'work' | 'rest' | 'holiday';

export interface ScheduleEntry {
  type: ScheduleEntryType;
  hours?: number;        // Hours worked (from contract)
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
