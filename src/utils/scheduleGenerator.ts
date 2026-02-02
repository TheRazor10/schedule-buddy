import {
  Employee,
  EmployeeSchedule,
  FirmSettings,
  MonthSchedule,
  Position,
} from '@/types/schedule';
import { getMonthData, getDaysInMonth, isHoliday } from '@/data/bulgarianCalendar2026';

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
 * Pre-plan rest days for a position using fair rotation
 * Distributes rest days evenly across the month while ensuring minPerDay coverage
 */
function planRestDaysForPosition(
  positionEmployees: Employee[],
  minPerDay: number,
  daysInMonth: number,
  targetWorkDays: number,
  holidayDays: Set<number>,
  worksOnHolidays: boolean
): Map<string, Set<number>> {
  const restDaysMap = new Map<string, Set<number>>();
  positionEmployees.forEach((emp) => restDaysMap.set(emp.id, new Set<number>()));

  if (positionEmployees.length === 0) return restDaysMap;

  // How many can rest each day while maintaining coverage
  const canRestPerDay = Math.max(0, positionEmployees.length - minPerDay);
  
  if (canRestPerDay === 0) {
    // Everyone must work every day - no rest possible from rotation
    return restDaysMap;
  }

  // Calculate how many rest days each employee needs
  // restDaysNeeded = totalDays - targetWorkDays - holidays (if firm closed)
  const holidayCount = worksOnHolidays ? 0 : holidayDays.size;
  const availableWorkDays = daysInMonth - holidayCount;
  const restDaysNeeded = Math.max(0, availableWorkDays - targetWorkDays);

  // Create rotation index for fair distribution
  let rotationIndex = 0;
  
  // Process each day and assign rest using rotation
  for (let day = 1; day <= daysInMonth; day++) {
    // Skip holidays if firm doesn't work on them (these are automatic rest)
    if (!worksOnHolidays && holidayDays.has(day)) {
      continue;
    }

    // Assign rest to employees in rotation, up to canRestPerDay
    let restsAssignedToday = 0;
    const employeesToConsider = [...positionEmployees];
    
    // Sort by who has fewer rest days assigned (to keep it balanced)
    employeesToConsider.sort((a, b) => {
      const aRests = restDaysMap.get(a.id)!.size;
      const bRests = restDaysMap.get(b.id)!.size;
      return aRests - bRests;
    });

    for (const emp of employeesToConsider) {
      if (restsAssignedToday >= canRestPerDay) break;
      
      const empRests = restDaysMap.get(emp.id)!;
      
      // Only assign if employee still needs rest days
      if (empRests.size < restDaysNeeded) {
        // Check we're not creating more than 6 consecutive work days
        // by checking if NOT resting today would cause issues
        empRests.add(day);
        restsAssignedToday++;
      }
    }
    
    rotationIndex = (rotationIndex + 1) % positionEmployees.length;
  }

  return restDaysMap;
}

/**
 * Main schedule generation algorithm with position-based rotation
 * Ensures employees work exactly the calendar's working days
 */
export function generateSchedule(options: ScheduleGeneratorOptions): MonthSchedule {
  const { firmSettings, employees, month, year } = options;
  const { positions, worksOnHolidays } = firmSettings;
  
  const monthData = getMonthData(month);
  const daysInMonth = getDaysInMonth(month, year);
  const calendarWorkingDays = monthData.workingDays;
  
  // Get holidays for this month
  const holidayDays = new Set(monthData.holidays);
  
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
      position.minPerDay,
      daysInMonth,
      calendarWorkingDays,
      holidayDays,
      worksOnHolidays
    );
    
    restPlan.forEach((restDays, empId) => {
      plannedRestDays.set(empId, restDays);
    });
  }

  // Track weekly hours for compliance checking
  const weeklyHours: Record<string, number[]> = {};
  const consecutiveWorkDays: Record<string, number> = {};
  
  employees.forEach((emp) => {
    weeklyHours[emp.id] = [0, 0, 0, 0, 0, 0];
    consecutiveWorkDays[emp.id] = 0;
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

      // Determine who works and who rests based on pre-planned rotation
      // But also check legal constraints
      const workingToday: Employee[] = [];
      const restingToday: Employee[] = [];

      for (const emp of positionEmployees) {
        const empSchedule = scheduleMap.get(emp.id)!;
        const plannedRest = plannedRestDays.get(emp.id) || new Set();
        
        // Check legal constraints
        const weeklyLimit = emp.isMinor ? 35 : 56;
        const currentWeekHours = weeklyHours[emp.id][weekIndex] || 0;
        
        const mustRestLegal = 
          consecutiveWorkDays[emp.id] >= 6 ||
          currentWeekHours >= weeklyLimit ||
          (isHolidayDay && emp.isMinor);

        if (mustRestLegal) {
          restingToday.push(emp);
        } else if (plannedRest.has(day)) {
          restingToday.push(emp);
        } else {
          workingToday.push(emp);
        }
      }

      // Ensure minimum coverage is met
      // If too many resting, pull some back to work (prioritize those without legal constraints)
      const minRequired = position.minPerDay;
      
      while (workingToday.length < minRequired && restingToday.length > 0) {
        // Find someone in restingToday who doesn't have legal constraints
        const canWorkIndex = restingToday.findIndex((emp) => {
          const weeklyLimit = emp.isMinor ? 35 : 56;
          const currentWeekHours = weeklyHours[emp.id][weekIndex] || 0;
          const mustRestLegal = 
            consecutiveWorkDays[emp.id] >= 6 ||
            currentWeekHours >= weeklyLimit ||
            (isHolidayDay && emp.isMinor);
          return !mustRestLegal;
        });

        if (canWorkIndex >= 0) {
          const emp = restingToday.splice(canWorkIndex, 1)[0];
          workingToday.push(emp);
        } else {
          // Everyone resting has legal constraints - can't meet coverage
          break;
        }
      }

      // Assign entries
      for (const emp of positionEmployees) {
        const empSchedule = scheduleMap.get(emp.id)!;
        
        if (restingToday.includes(emp)) {
          empSchedule.entries[day] = { type: 'rest' };
          empSchedule.totalRestDays++;
          consecutiveWorkDays[emp.id] = 0;
        } else {
          const hours = emp.contractHours;
          empSchedule.entries[day] = { type: 'work', hours };
          empSchedule.totalHours += hours;
          empSchedule.totalWorkDays++;
          consecutiveWorkDays[emp.id]++;
          weeklyHours[emp.id][weekIndex] = (weeklyHours[emp.id][weekIndex] || 0) + hours;
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
    generatedAt: new Date(),
  };
}
