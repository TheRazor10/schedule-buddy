import {
  Employee,
  EmployeeSchedule,
  FirmSettings,
  MonthSchedule,
  ScheduleEntry,
  Shift,
} from '@/types/schedule';
import { getMonthData, getDaysInMonth, isHoliday, isWeekend } from '@/data/bulgarianCalendar2026';

interface ScheduleGeneratorOptions {
  firmSettings: FirmSettings;
  employees: Employee[];
  month: number;
  year: number;
}

/**
 * Calculate hours between two time strings (HH:mm format)
 */
function calculateHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  let hours = endH - startH + (endM - startM) / 60;
  if (hours < 0) hours += 24; // Handle overnight shifts
  
  return hours;
}

/**
 * Check if a shift ends after 20:00
 */
function shiftEndsAfter20(shift: Shift): boolean {
  const [endH] = shift.endTime.split(':').map(Number);
  return endH >= 20;
}

/**
 * Get eligible shifts for an employee
 */
function getEligibleShifts(employee: Employee, shifts: Shift[]): Shift[] {
  return shifts.filter((shift) => {
    // Minors cannot work shifts ending after 20:00
    if (employee.isMinor && shiftEndsAfter20(shift)) {
      return false;
    }
    // Check if shift hours are compatible with contract hours
    // Employee can work shifts <= their contract hours
    return shift.hours <= employee.contractHours * 1.5; // Allow some flexibility
  });
}

/**
 * Main schedule generation algorithm
 */
export function generateSchedule(options: ScheduleGeneratorOptions): MonthSchedule {
  const { firmSettings, employees, month, year } = options;
  const { shifts, worksOnHolidays } = firmSettings;
  
  const monthData = getMonthData(month);
  const daysInMonth = getDaysInMonth(month, year);
  
  // Initialize employee schedules
  const employeeSchedules: EmployeeSchedule[] = employees.map((emp) => ({
    employeeId: emp.id,
    entries: {},
    totalHours: 0,
    totalRestDays: 0,
    totalWorkDays: 0,
    isCompliant: true,
    complianceIssues: [],
  }));

  // Track consecutive work days for each employee
  const consecutiveWorkDays: Record<string, number> = {};
  const consecutive12HourDays: Record<string, number> = {};
  const weeklyHours: Record<string, number[]> = {}; // Track hours per week
  
  employees.forEach((emp) => {
    consecutiveWorkDays[emp.id] = 0;
    consecutive12HourDays[emp.id] = 0;
    weeklyHours[emp.id] = [0, 0, 0, 0, 0, 0]; // Up to 6 weeks in a month
  });

  // Calculate target hours for each employee based on contract ratio
  // Use full working hours for part-time employees - they work the same number of days but shorter shifts
  const targetHoursPerEmployee: Record<string, number> = {};
  employees.forEach((emp) => {
    // For minors and part-time workers, calculate based on their daily hours x working days
    // A 7h/day employee should work ~7h x workingDays, not a reduced ratio
    targetHoursPerEmployee[emp.id] = emp.contractHours * monthData.workingDays;
  });

  // Process each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month - 1, day);
    const isHolidayDay = isHoliday(currentDate);
    const isWeekendDay = isWeekend(currentDate);
    const weekIndex = Math.floor((day - 1) / 7);

    // Determine which employees work this day
    for (let empIndex = 0; empIndex < employees.length; empIndex++) {
      const employee = employees[empIndex];
      const empSchedule = employeeSchedules[empIndex];
      const empId = employee.id;

      // Check if this is a holiday and firm doesn't work on holidays
      if (isHolidayDay && !worksOnHolidays) {
        empSchedule.entries[day] = { type: 'holiday' };
        consecutiveWorkDays[empId] = 0;
        consecutive12HourDays[empId] = 0;
        continue;
      }

      // Minors cannot work on holidays
      if (isHolidayDay && employee.isMinor) {
        empSchedule.entries[day] = { type: 'holiday' };
        consecutiveWorkDays[empId] = 0;
        consecutive12HourDays[empId] = 0;
        continue;
      }

      // Check if employee needs rest (max 6 consecutive work days)
      const needsRest = consecutiveWorkDays[empId] >= 6;
      
      // Check 12-hour shift rule (max 2 consecutive)
      const needs12HourRest = consecutive12HourDays[empId] >= 2;

      // Calculate current weekly hours
      const currentWeekHours = weeklyHours[empId][weekIndex] || 0;
      const weeklyLimit = employee.isMinor ? 35 : 56;
      const reachedWeeklyLimit = currentWeekHours >= weeklyLimit;

      // Check if employee has reached target hours (with some buffer for balance)
      const reachedTargetHours = empSchedule.totalHours >= targetHoursPerEmployee[empId];

      // Determine if employee should rest today
      // Employees should work regularly - rest only when rules require it
      const shouldRest = needsRest || reachedWeeklyLimit || reachedTargetHours;

      if (shouldRest || needs12HourRest) {
        empSchedule.entries[day] = { type: 'rest' };
        empSchedule.totalRestDays++;
        consecutiveWorkDays[empId] = 0;
        consecutive12HourDays[empId] = 0;
        continue;
      }

      // Get eligible shifts for this employee
      const eligibleShifts = getEligibleShifts(employee, shifts);
      
      if (eligibleShifts.length === 0) {
        empSchedule.entries[day] = { type: 'rest' };
        empSchedule.totalRestDays++;
        consecutiveWorkDays[empId] = 0;
        continue;
      }

      // Select a shift (alternate between shifts for fairness)
      const shiftIndex = (empSchedule.totalWorkDays + empIndex) % eligibleShifts.length;
      const selectedShift = eligibleShifts[shiftIndex];

      // Check minor daily hour limit (max 7 hours)
      if (employee.isMinor && selectedShift.hours > 7) {
        // Find a shorter shift or rest
        const shortShift = eligibleShifts.find((s) => s.hours <= 7);
        if (!shortShift) {
          empSchedule.entries[day] = { type: 'rest' };
          empSchedule.totalRestDays++;
          consecutiveWorkDays[empId] = 0;
          continue;
        }
      }

      // Check if adding this shift would exceed weekly limit
      if (currentWeekHours + selectedShift.hours > weeklyLimit) {
        empSchedule.entries[day] = { type: 'rest' };
        empSchedule.totalRestDays++;
        consecutiveWorkDays[empId] = 0;
        consecutive12HourDays[empId] = 0;
        continue;
      }

      // Assign the shift
      empSchedule.entries[day] = {
        type: 'shift',
        shiftId: selectedShift.id,
        shiftName: selectedShift.name,
        hours: selectedShift.hours,
      };

      empSchedule.totalHours += selectedShift.hours;
      empSchedule.totalWorkDays++;
      consecutiveWorkDays[empId]++;
      weeklyHours[empId][weekIndex] = (weeklyHours[empId][weekIndex] || 0) + selectedShift.hours;

      // Track 12-hour shifts
      if (selectedShift.hours >= 12) {
        consecutive12HourDays[empId]++;
      } else {
        consecutive12HourDays[empId] = 0;
      }
    }

    // Ensure at least one employee works each day (coverage rule)
    const workingToday = employeeSchedules.filter(
      (es) => es.entries[day]?.type === 'shift'
    );

    if (workingToday.length === 0 && employees.length > 0 && 
        (!isHolidayDay || worksOnHolidays)) {
      // Force assign the employee with least hours
      const eligibleEmployees = employees
        .map((emp, idx) => ({ emp, schedule: employeeSchedules[idx] }))
        .filter(({ emp }) => !(isHolidayDay && emp.isMinor))
        .sort((a, b) => a.schedule.totalHours - b.schedule.totalHours);

      if (eligibleEmployees.length > 0) {
        const { emp, schedule } = eligibleEmployees[0];
        const eligibleShifts = getEligibleShifts(emp, shifts);
        
        if (eligibleShifts.length > 0) {
          const shift = eligibleShifts[0];
          schedule.entries[day] = {
            type: 'shift',
            shiftId: shift.id,
            shiftName: shift.name,
            hours: shift.hours,
          };
          schedule.totalHours += shift.hours;
          schedule.totalWorkDays++;
          if (schedule.entries[day]?.type === 'rest') {
            schedule.totalRestDays--;
          }
        }
      }
    }
  }

  // Validate compliance for each employee
  employeeSchedules.forEach((empSchedule, idx) => {
    const employee = employees[idx];
    const issues: string[] = [];

    // Check target hours
    const targetHours = targetHoursPerEmployee[employee.id];
    const hoursDiff = Math.abs(empSchedule.totalHours - targetHours);
    if (hoursDiff > 8) {
      issues.push(`Часовете (${empSchedule.totalHours}ч) се различават от целевите (${targetHours}ч)`);
    }

    // Check weekly hour limits
    const empWeeklyHours = weeklyHours[employee.id];
    const weeklyLimit = employee.isMinor ? 35 : 56;
    empWeeklyHours.forEach((hours, week) => {
      if (hours > weeklyLimit) {
        issues.push(`Седмица ${week + 1}: ${hours}ч надвишава лимита от ${weeklyLimit}ч`);
      }
    });

    empSchedule.complianceIssues = issues;
    empSchedule.isCompliant = issues.length === 0;
  });

  return {
    month,
    year,
    employeeSchedules,
    generatedAt: new Date(),
  };
}

export { calculateHours };
