import {
  CoverageGap,
  Employee,
  EmployeeSchedule,
  FirmSettings,
  MonthSchedule,
  Position,
  Shift,
} from '@/types/schedule';
import { getMonthData, getDaysInMonth, isHoliday } from '@/data/bulgarianCalendar2026';
import { calculateShiftHours, isExtendedShift, calculateOvertime, calculateNetShiftHours } from '@/utils/shiftUtils';

interface ScheduleGeneratorOptions {
  firmSettings: FirmSettings;
  employees: Employee[];
  month: number;
  year: number;
}

/**
 * Get employees grouped by position
 */
function getEmployeesByPosition(
  employees: Employee[],
  positions: Position[]
): Map<string, Employee[]> {
  const map = new Map<string, Employee[]>();
  positions.forEach((pos) => {
    map.set(pos.id, employees.filter((e) => e.positionId === pos.id));
  });
  return map;
}

/**
 * Check if a position uses the "handoff" pattern
 * Handoff pattern: 2 employees, minPerDay=1 → ensure coverage, stagger rest days
 * Both employees can work on the same day - just ensure at least 1 is always working
 */
function isHandoffPosition(position: Position, employeeCount: number): boolean {
  return employeeCount === 2 && position.minPerDay === 1;
}

/**
 * Pre-plan rest days for a position to reach target working days
 * Distributes rest days evenly across the month (not consecutive)
 * For handoff positions (2 employees, minPerDay=1): creates complementary schedules
 */
function planRestDaysForPosition(
  positionEmployees: Employee[],
  position: Position,
  daysInMonth: number,
  targetWorkDays: number,
  holidayDays: Set<number>,
  worksOnHolidays: boolean,
  shifts: Shift[],
  firmOperatingDays: Set<number>,
  month: number,
  year: number
): Map<string, Set<number>> {
  const restDaysMap = new Map<string, Set<number>>();
  positionEmployees.forEach((emp) => restDaysMap.set(emp.id, new Set<number>()));

  if (positionEmployees.length === 0) return restDaysMap;

  // Check if this is a handoff position (2 employees, minPerDay=1)
  const useHandoffPattern = isHandoffPosition(position, positionEmployees.length);
  
  // Check if any shift is extended (≥10h) for 2-on-2-off pattern
  const hasExtendedShifts = shifts.some(s => isExtendedShift(s.startTime, s.endTime));

  if (useHandoffPattern) {
    // HANDOFF PATTERN: Employee A and B take turns
    // Employee B's schedule = inverse of Employee A's schedule
    return planHandoffSchedule(
      positionEmployees,
      daysInMonth,
      targetWorkDays,
      holidayDays,
      worksOnHolidays,
      hasExtendedShifts,
      firmOperatingDays,
      month,
      year
    );
  }

  // Standard scheduling for non-handoff positions
  return planStandardRestDays(
    positionEmployees,
    daysInMonth,
    targetWorkDays,
    holidayDays,
    worksOnHolidays,
    firmOperatingDays,
    month,
    year
  );
}

/**
 * Plan handoff schedule for 2 employees ensuring coverage
 * Both employees work toward target days, but rest days are staggered
 * so at least one person is always working
 */
function planHandoffSchedule(
  employees: Employee[],
  daysInMonth: number,
  targetWorkDays: number,
  holidayDays: Set<number>,
  worksOnHolidays: boolean,
  hasExtendedShifts: boolean,
  firmOperatingDays: Set<number>,
  month: number,
  year: number
): Map<string, Set<number>> {
  const restDaysMap = new Map<string, Set<number>>();
  const [empA, empB] = employees;
  
  restDaysMap.set(empA.id, new Set<number>());
  restDaysMap.set(empB.id, new Set<number>());
  
  const restDaysA = restDaysMap.get(empA.id)!;
  const restDaysB = restDaysMap.get(empB.id)!;
  
  // Get workable days (exclude holidays if firm doesn't work AND exclude firm-closed days)
  const workableDays: number[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    if (!worksOnHolidays && holidayDays.has(day)) continue;
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    if (!firmOperatingDays.has(dayOfWeek)) continue;
    workableDays.push(day);
  }
  
  // Calculate how many rest days each employee needs
  const restDaysNeeded = Math.max(0, workableDays.length - targetWorkDays);
  
  if (restDaysNeeded <= 0) {
    // No rest days needed - both work every workable day
    return restDaysMap;
  }
  
  // Distribute rest days for both employees, but stagger them so they don't overlap
  // This ensures at least 1 person is always working
  
  // Calculate ideal spacing between rest days
  const spacing = workableDays.length / (restDaysNeeded + 1);
  
  // Assign rest days for Employee A at regular intervals
  for (let i = 1; i <= restDaysNeeded; i++) {
    const idealIndex = Math.floor(i * spacing) - 1;
    const dayIndex = Math.min(Math.max(0, idealIndex), workableDays.length - 1);
    
    // Find day that isn't already a rest day
    let selectedDay = workableDays[dayIndex];
    let offset = 0;
    while (restDaysA.has(selectedDay)) {
      offset++;
      const tryIndex = (dayIndex + offset) % workableDays.length;
      selectedDay = workableDays[tryIndex];
      if (offset > workableDays.length) break;
    }
    restDaysA.add(selectedDay);
  }
  
  // Assign rest days for Employee B, offset from A's rest days
  // Use half-spacing offset to stagger rest days
  const offsetShift = Math.floor(spacing / 2);
  
  for (let i = 1; i <= restDaysNeeded; i++) {
    const idealIndex = Math.floor(i * spacing) - 1 + offsetShift;
    const dayIndex = Math.min(Math.max(0, idealIndex), workableDays.length - 1);
    
    // Find day that isn't already a rest day for B AND isn't same as A's rest
    let selectedDay = workableDays[dayIndex];
    let offset = 0;
    while (restDaysB.has(selectedDay) || restDaysA.has(selectedDay)) {
      offset++;
      const tryIndex = (dayIndex + offset) % workableDays.length;
      selectedDay = workableDays[tryIndex];
      if (offset > workableDays.length) {
        // If we can't find a non-overlapping day, just pick any non-rest day for B
        for (const day of workableDays) {
          if (!restDaysB.has(day)) {
            selectedDay = day;
            break;
          }
        }
        break;
      }
    }
    restDaysB.add(selectedDay);
  }
  
  return restDaysMap;
}

/**
 * Standard rest day planning for non-handoff positions
 */
function planStandardRestDays(
  positionEmployees: Employee[],
  daysInMonth: number,
  targetWorkDays: number,
  holidayDays: Set<number>,
  worksOnHolidays: boolean,
  firmOperatingDays: Set<number>,
  month: number,
  year: number
): Map<string, Set<number>> {
  const restDaysMap = new Map<string, Set<number>>();
  positionEmployees.forEach((emp) => restDaysMap.set(emp.id, new Set<number>()));

  // Get workable days (exclude holidays if firm doesn't work AND exclude firm-closed days)
  const workableDays: number[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    if (!worksOnHolidays && holidayDays.has(day)) continue;
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    if (!firmOperatingDays.has(dayOfWeek)) continue;
    workableDays.push(day);
  }

  // Calculate how many rest days each employee needs from the workable days
  const restDaysNeeded = Math.max(0, workableDays.length - targetWorkDays);

  // For each employee, distribute rest days evenly across the month
  for (const emp of positionEmployees) {
    const empRests = restDaysMap.get(emp.id)!;
    
    if (restDaysNeeded <= 0) continue;
    
    // Calculate ideal spacing between rest days
    const spacing = workableDays.length / (restDaysNeeded + 1);
    
    // Assign rest days at regular intervals
    for (let i = 1; i <= restDaysNeeded; i++) {
      const idealIndex = Math.floor(i * spacing) - 1;
      const dayIndex = Math.min(idealIndex, workableDays.length - 1);
      
      // Find nearest day that isn't already a rest day
      let selectedDay = workableDays[dayIndex];
      
      // Avoid consecutive rest days by checking neighbors
      let offset = 0;
      while (empRests.has(selectedDay) || 
             empRests.has(selectedDay - 1) || 
             empRests.has(selectedDay + 1)) {
        offset++;
        const tryIndex = dayIndex + offset;
        const tryIndexBack = dayIndex - offset;
        
        if (tryIndex < workableDays.length && !empRests.has(workableDays[tryIndex])) {
          selectedDay = workableDays[tryIndex];
          break;
        } else if (tryIndexBack >= 0 && !empRests.has(workableDays[tryIndexBack])) {
          selectedDay = workableDays[tryIndexBack];
          break;
        }
        
        if (offset > workableDays.length) break; // Safety
      }
      
      empRests.add(selectedDay);
    }
  }

  // Stagger rest days between employees to spread gaps across different days
  const employeeList = [...positionEmployees];
  for (let i = 1; i < employeeList.length; i++) {
    const empRests = restDaysMap.get(employeeList[i].id)!;
    const restArray = [...empRests].sort((a, b) => a - b);
    
    // Shift rest days by an offset based on employee index
    const shiftAmount = Math.floor(i * (30 / positionEmployees.length / restDaysNeeded));
    
    if (shiftAmount > 0 && restArray.length > 0) {
      const newRests = new Set<number>();
      for (const day of restArray) {
        let newDay = day + shiftAmount;
        // Wrap around if exceeds month
        while (newDay > daysInMonth) newDay -= daysInMonth;
        while (newDay < 1) newDay += daysInMonth;
        // Skip holidays
        if (!worksOnHolidays && holidayDays.has(newDay)) {
          newDay = (newDay % daysInMonth) + 1;
        }
        newRests.add(newDay);
      }
      restDaysMap.set(employeeList[i].id, newRests);
    }
  }

  return restDaysMap;
}

/**
 * Assign shifts to working employees for a day - POSITION-BALANCED
 * Distributes employees evenly across shifts for each position on each day
 * Ensures coverage on all shifts, not clustering everyone on one shift
 */
function assignShiftsToEmployees(
  workingEmployees: Employee[],
  shifts: Shift[],
  day: number,
  positionId: string,
  dailyShiftBalance: Map<string, number> // tracks which shift gets "extra" employee for odd counts
): Map<string, string> {
  const shiftAssignments = new Map<string, string>();
  
  if (shifts.length === 0 || workingEmployees.length === 0) {
    return shiftAssignments;
  }

  const numShifts = shifts.length;
  const numEmployees = workingEmployees.length;
  
  // Calculate how many employees per shift
  const basePerShift = Math.floor(numEmployees / numShifts);
  const remainder = numEmployees % numShifts;
  
  // Track which shift gets the extra employee(s) - alternates by day
  const balanceKey = `${positionId}`;
  const dayOffset = dailyShiftBalance.get(balanceKey) || 0;
  
  // Build shift slots: distribute evenly, with remainder rotating
  const shiftSlots: string[] = [];
  for (let i = 0; i < numShifts; i++) {
    const shiftId = shifts[i].id;
    let count = basePerShift;
    // Add one extra to shifts based on rotating offset
    if (i < remainder) {
      const adjustedIndex = (i + dayOffset) % numShifts;
      if (adjustedIndex < remainder) {
        count++;
      }
    }
    // Actually, simpler approach: first 'remainder' shifts get +1, but rotate which ones
    for (let j = 0; j < basePerShift; j++) {
      shiftSlots.push(shiftId);
    }
  }
  
  // Add remainder slots with rotation
  for (let i = 0; i < remainder; i++) {
    const shiftIndex = (i + dayOffset) % numShifts;
    shiftSlots.push(shifts[shiftIndex].id);
  }
  
  // Sort employees by their ID for consistent ordering, then assign
  const sortedEmployees = [...workingEmployees].sort((a, b) => a.id.localeCompare(b.id));
  
  // Rotate employee order based on day for fairness
  const rotatedEmployees: Employee[] = [];
  const rotation = (day - 1) % sortedEmployees.length;
  for (let i = 0; i < sortedEmployees.length; i++) {
    const idx = (i + rotation) % sortedEmployees.length;
    rotatedEmployees.push(sortedEmployees[idx]);
  }
  
  // Assign shifts
  for (let i = 0; i < rotatedEmployees.length; i++) {
    const emp = rotatedEmployees[i];
    const shiftId = shiftSlots[i % shiftSlots.length];
    shiftAssignments.set(emp.id, shiftId);
  }
  
  // Increment balance offset for next day
  dailyShiftBalance.set(balanceKey, dayOffset + 1);

  return shiftAssignments;
}

/**
 * Main schedule generation algorithm with position-based rotation
 * Ensures employees work exactly the calendar's working days
 * Assigns specific shifts to each work day
 */
export function generateSchedule(options: ScheduleGeneratorOptions): MonthSchedule {
  const { firmSettings, employees, month, year } = options;
  const { positions, shifts, worksOnHolidays, operatingDays } = firmSettings;
  
  const monthData = getMonthData(month);
  const daysInMonth = getDaysInMonth(month, year);
  const calendarWorkingDays = monthData.workingDays;
  
  // Get holidays for this month
  const holidayDays = new Set(monthData.holidays);
  
  // Get firm operating days (default to Mon-Fri if not set)
  const firmOperatingDays = new Set(operatingDays ?? [1, 2, 3, 4, 5]);
  
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

  // Create a lookup map for employee schedules
  const scheduleMap = new Map<string, EmployeeSchedule>();
  employeeSchedules.forEach((es, idx) => {
    scheduleMap.set(employees[idx].id, es);
  });

  // Get employees by position
  const employeesByPosition = getEmployeesByPosition(employees, positions);
  
  // Pre-plan rest days for each position using rotation
  const plannedRestDays = new Map<string, Set<number>>();
  
  for (const position of positions) {
    const positionEmployees = employeesByPosition.get(position.id) || [];
    const restPlan = planRestDaysForPosition(
      positionEmployees,
      position,
      daysInMonth,
      calendarWorkingDays,
      holidayDays,
      worksOnHolidays,
      shifts,
      firmOperatingDays,
      month,
      year
    );
    
    restPlan.forEach((restDays, empId) => {
      plannedRestDays.set(empId, restDays);
    });
  }

  // Track coverage gaps
  const coverageGaps: CoverageGap[] = [];

  // Track weekly hours for compliance checking
  const weeklyHours: Record<string, number[]> = {};
  const consecutiveWorkDays: Record<string, number> = {};
  // Track consecutive EXTENDED shift days (for 2-on rule)
  const consecutiveExtendedDays: Record<string, number> = {};
  // Track if employee just finished extended shift block (needs 1-2 day rest)
  const needsExtendedRest: Record<string, number> = {}; // days of rest still needed
  
  // Track daily shift balance per position (for rotating "extra" employee)
  const dailyShiftBalance = new Map<string, number>();
  
  employees.forEach((emp) => {
    weeklyHours[emp.id] = [0, 0, 0, 0, 0, 0];
    consecutiveWorkDays[emp.id] = 0;
    consecutiveExtendedDays[emp.id] = 0;
    needsExtendedRest[emp.id] = 0;
  });

  // Process each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month - 1, day);
    const isHolidayDay = isHoliday(currentDate);
    const weekIndex = Math.floor((day - 1) / 7);

    // Process each position
    for (const position of positions) {
      const positionEmployees = employeesByPosition.get(position.id) || [];
      if (positionEmployees.length === 0) continue;

      // Handle holidays when firm doesn't work
      if (isHolidayDay && !worksOnHolidays) {
        for (const emp of positionEmployees) {
          const empSchedule = scheduleMap.get(emp.id)!;
          empSchedule.entries[day] = { type: 'holiday' };
          consecutiveWorkDays[emp.id] = 0;
        }
        continue;
      }
      
      // Handle firm closed days (days of week when firm doesn't operate)
      const dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, etc.
      if (!firmOperatingDays.has(dayOfWeek)) {
        for (const emp of positionEmployees) {
          const empSchedule = scheduleMap.get(emp.id)!;
          empSchedule.entries[day] = { type: 'rest' };
          empSchedule.totalRestDays++;
          consecutiveWorkDays[emp.id] = 0;
        }
        continue;
      }

      // Determine who works and who rests based on pre-planned rotation
      // But also check legal constraints INCLUDING extended shift rules
      const workingToday: Employee[] = [];
      const restingToday: Employee[] = [];

      for (const emp of positionEmployees) {
        const empSchedule = scheduleMap.get(emp.id)!;
        const plannedRest = plannedRestDays.get(emp.id) || new Set();
        
        // Check legal constraints
        const weeklyLimit = emp.isMinor ? 35 : 56;
        const currentWeekHours = weeklyHours[emp.id][weekIndex] || 0;
        
        // Check if employee needs rest after extended shift block
        const needsExtendedRestDays = needsExtendedRest[emp.id] > 0;
        
        // Check if employee has worked 2 consecutive extended shifts (max allowed)
        const maxExtendedReached = consecutiveExtendedDays[emp.id] >= 2;

        const mustRestLegal = 
          consecutiveWorkDays[emp.id] >= 6 ||
          currentWeekHours >= weeklyLimit ||
          (isHolidayDay && emp.isMinor) ||
          needsExtendedRestDays ||  // Must rest after extended shift block
          maxExtendedReached;       // Must rest after 2 consecutive extended shifts

        if (mustRestLegal) {
          restingToday.push(emp);
        } else if (plannedRest.has(day)) {
          restingToday.push(emp);
        } else {
          workingToday.push(emp);
        }
      }

      // Don't force employees back to work - accept understaffing
      // Just track coverage gaps
      const minRequired = position.minPerDay;
      
      if (workingToday.length < minRequired) {
        coverageGaps.push({
          day,
          positionId: position.id,
          positionName: position.name,
          required: minRequired,
          actual: workingToday.length,
        });
      }

      // Assign shifts to working employees - balanced per position
      const shiftAssignments = assignShiftsToEmployees(
        workingToday,
        shifts,
        day,
        position.id,
        dailyShiftBalance
      );

      // Assign entries
      for (const emp of positionEmployees) {
        const empSchedule = scheduleMap.get(emp.id)!;
        
        if (restingToday.includes(emp)) {
          empSchedule.entries[day] = { type: 'rest' };
          empSchedule.totalRestDays++;
          consecutiveWorkDays[emp.id] = 0;
          
          // Decrement extended rest counter if needed
          if (needsExtendedRest[emp.id] > 0) {
            needsExtendedRest[emp.id]--;
          }
          // Reset consecutive extended days on rest
          consecutiveExtendedDays[emp.id] = 0;
        } else {
          const shiftId = shiftAssignments.get(emp.id);
          const shift = shifts.find(s => s.id === shiftId);
          
          // Calculate NET hours from shift duration minus break time
          const breakMinutes = shift?.breakMinutes ?? 0;
          const shiftHours = shift ? calculateNetShiftHours(shift.startTime, shift.endTime, breakMinutes) : emp.contractHours;
          const overtime = calculateOvertime(shiftHours, emp.contractHours);
          const isExtended = shift ? isExtendedShift(shift.startTime, shift.endTime) : false;
          
          empSchedule.entries[day] = { 
            type: 'work', 
            hours: shiftHours,  // Actual shift hours worked
            shiftId,
            contractHours: emp.contractHours,
            overtimeHours: overtime
          };
          empSchedule.totalHours += shiftHours;
          empSchedule.totalWorkDays++;
          consecutiveWorkDays[emp.id]++;
          weeklyHours[emp.id][weekIndex] = (weeklyHours[emp.id][weekIndex] || 0) + shiftHours;
          
          // Track extended shift consecutive days
          if (isExtended) {
            consecutiveExtendedDays[emp.id]++;
            // If just completed 2 extended shifts, require 1-2 day rest (we use 2)
            if (consecutiveExtendedDays[emp.id] >= 2) {
              needsExtendedRest[emp.id] = 2; // 2-on-2-off pattern
            }
          } else {
            // Reset extended counter on non-extended shift
            consecutiveExtendedDays[emp.id] = 0;
          }
        }
      }
    }
  }

  // Validate compliance for each employee
  const targetHours = calendarWorkingDays * 8; // Standard target for 8h contracts
  
  employeeSchedules.forEach((empSchedule) => {
    const employee = employees.find((e) => e.id === empSchedule.employeeId);
    if (!employee) return;
    
    const issues: string[] = [];
    const empTargetHours = calendarWorkingDays * employee.contractHours;

    // Check target hours
    const hoursDiff = empSchedule.totalHours - empTargetHours;
    if (hoursDiff > 8) {
      issues.push(`Часовете (${empSchedule.totalHours}ч) надвишават целевите (${empTargetHours}ч)`);
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
    coverageGaps,
    generatedAt: new Date(),
  };
}
