import { BulgarianCalendar, MonthlyCalendarData } from '@/types/schedule';

// Official Bulgarian Holidays for 2026
export const BULGARIAN_HOLIDAYS_2026: Date[] = [
  // January 1 - New Year's Day
  new Date(2026, 0, 1),
  // March 3 - Liberation Day
  new Date(2026, 2, 3),
  // April 10-13 - Orthodox Easter (Friday-Monday)
  new Date(2026, 3, 10),
  new Date(2026, 3, 11),
  new Date(2026, 3, 12),
  new Date(2026, 3, 13),
  // May 1 - Labor Day
  new Date(2026, 4, 1),
  // May 6 - St. George's Day (Bulgarian Armed Forces Day)
  new Date(2026, 4, 6),
  // September 6 - Unification Day
  new Date(2026, 8, 6),
  // September 22 - Independence Day
  new Date(2026, 8, 22),
  // December 24-26 - Christmas
  new Date(2026, 11, 24),
  new Date(2026, 11, 25),
  new Date(2026, 11, 26),
];

// Monthly working days and hours based on official Bulgarian calendar 2026
export const MONTHLY_DATA_2026: Record<number, MonthlyCalendarData> = {
  1: { workingDays: 20, workingHours: 160, holidays: [1] },
  2: { workingDays: 20, workingHours: 160, holidays: [] },
  3: { workingDays: 21, workingHours: 168, holidays: [3] },
  4: { workingDays: 20, workingHours: 160, holidays: [10, 11, 12, 13] },
  5: { workingDays: 18, workingHours: 144, holidays: [1, 6] },
  6: { workingDays: 22, workingHours: 176, holidays: [] },
  7: { workingDays: 23, workingHours: 184, holidays: [] },
  8: { workingDays: 21, workingHours: 168, holidays: [] },
  9: { workingDays: 20, workingHours: 160, holidays: [6, 22] },
  10: { workingDays: 22, workingHours: 176, holidays: [] },
  11: { workingDays: 21, workingHours: 168, holidays: [] },
  12: { workingDays: 20, workingHours: 160, holidays: [24, 25, 26] },
};

export const BULGARIAN_CALENDAR_2026: BulgarianCalendar = {
  year: 2026,
  months: MONTHLY_DATA_2026,
  allHolidays: BULGARIAN_HOLIDAYS_2026,
};

// Helper functions
export function isHoliday(date: Date): boolean {
  return BULGARIAN_HOLIDAYS_2026.some(
    (holiday) =>
      holiday.getFullYear() === date.getFullYear() &&
      holiday.getMonth() === date.getMonth() &&
      holiday.getDate() === date.getDate()
  );
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

export function getMonthData(month: number): MonthlyCalendarData {
  return MONTHLY_DATA_2026[month] || { workingDays: 22, workingHours: 176, holidays: [] };
}

export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function getMonthName(month: number): string {
  const months = [
    'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
    'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'
  ];
  return months[month - 1] || '';
}

export function getMonthNameEn(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}
