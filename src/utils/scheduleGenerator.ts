import {
  Employee,
  EmployeeSchedule,
  FirmSettings,
  MonthSchedule,
  Position,
} from '@/types/schedule';
import { getMonthData, getDaysInMonth, isHoliday, isWeekend } from '@/data/bulgarianCalendar2026';

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
 * Main schedule generation algorithm with position-based rotation
 */
export function generateSchedule(options: ScheduleGeneratorOptions): MonthSchedule {
  const { firmSettings, employees, month, year } = options;
  const { positions, worksOnHolidays } = firmSettings;
  
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

  // Create a lookup map for employee schedules
  const scheduleMap = new Map<string, EmployeeSchedule>();
  employeeSchedules.forEach((es, idx) => {
    scheduleMap.set(employees[idx].id, es);
  });

  // Track consecutive work days for each employee
  const consecutiveWorkDays: Record<string, number> = {};
  const weeklyHours: Record<string, number[]> = {};
  
  employees.forEach((emp) => {
    consecutiveWorkDays[emp.id] = 0;
    weeklyHours[emp.id] = [0, 0, 0, 0, 0, 0];
  });

  // Calculate target hours for each employee
  const targetHoursPerEmployee: Record<string, number> = {};
  employees.forEach((emp) => {
    targetHoursPerEmployee[emp.id] = emp.contractHours * monthData.workingDays;
  });

  // Get employees by position for coverage rotation
  const employeesByPosition = getEmployeesByPosition(employees, positions);
  
  // Track rotation index per position (for fair rest day distribution)
  const rotationIndex: Record<string, number> = {};
  positions.forEach((pos) => {
    rotationIndex[pos.id] = 0;
  });

  // Process each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month - 1, day);
    const isHolidayDay = isHoliday(currentDate);
    const weekIndex = Math.floor((day - 1) / 7);

    // Process each position separately to ensure coverage
    for (const position of positions) {
      const positionEmployees = employeesByPosition.get(position.id) || [];
      if (positionEmployees.length === 0) continue;

      // Check if this is a holiday and firm doesn't work on holidays
      if (isHolidayDay && !worksOnHolidays) {
        // All employees in this position get holiday
        for (const emp of positionEmployees) {
          const empSchedule = scheduleMap.get(emp.id)!;
          empSchedule.entries[day] = { type: 'holiday' };
          consecutiveWorkDays[emp.id] = 0;
        }
        continue;
      }

      // Determine who MUST rest (legal requirements only)
      const employeeRestPriority = positionEmployees.map((emp) => {
        const empSchedule = scheduleMap.get(emp.id)!;
        const weeklyLimit = emp.isMinor ? 35 : 56;
        const currentWeekHours = weeklyHours[emp.id][weekIndex] || 0;
        
        // Only force rest for legal/target reasons
        const mustRest = 
          consecutiveWorkDays[emp.id] >= 6 ||
          currentWeekHours >= weeklyLimit ||
          empSchedule.totalHours >= targetHoursPerEmployee[emp.id] ||
          (isHolidayDay && emp.isMinor);

        // Check if employee still needs hours to reach target
        const needsMoreHours = empSchedule.totalHours < targetHoursPerEmployee[emp.id];
        
        return {
          employee: emp,
          mustRest,
          needsMoreHours,
          totalHours: empSchedule.totalHours,
          consecutiveDays: consecutiveWorkDays[emp.id],
        };
      });

      // Employees who MUST rest (legal requirements)
      const mustRestEmployees = employeeRestPriority.filter((e) => e.mustRest);
      
      // Employees who CAN work
      const canWorkEmployees = employeeRestPriority.filter((e) => !e.mustRest);
      
      // KEY CHANGE: Only rest if you MUST rest or you've reached target hours
      // If you still need hours, you work - even if others in your position are also working
      let restingEmployees: Employee[] = mustRestEmployees.map((e) => e.employee);
      
      // Only add voluntary rest for employees who have reached their target hours
      // AND we still have enough coverage (minPerDay)
      const workingCount = canWorkEmployees.length;
      const minRequired = position.minPerDay;
      
      if (workingCount > minRequired) {
        // We have more workers than needed - give rest to those who reached target
        const reachedTarget = canWorkEmployees.filter((e) => !e.needsMoreHours);
        const stillNeedHours = canWorkEmployees.filter((e) => e.needsMoreHours);
        
        // Calculate how many can rest while maintaining coverage
        const maxCanRest = workingCount - minRequired;
        
        // Prioritize rest for those who reached target (sort by most hours first)
        const sortedReachedTarget = [...reachedTarget].sort((a, b) => b.totalHours - a.totalHours);
        
        for (let i = 0; i < Math.min(maxCanRest, sortedReachedTarget.length); i++) {
          restingEmployees.push(sortedReachedTarget[i].employee);
        }
      }

      const restingIds = new Set(restingEmployees.map((e) => e.id));

      // Assign work or rest for each employee in this position
      for (const emp of positionEmployees) {
        const empSchedule = scheduleMap.get(emp.id)!;
        
        if (restingIds.has(emp.id)) {
          // This employee rests today
          empSchedule.entries[day] = { type: 'rest' };
          empSchedule.totalRestDays++;
          consecutiveWorkDays[emp.id] = 0;
        } else {
          // This employee works today
          const hours = emp.contractHours;
          empSchedule.entries[day] = {
            type: 'work',
            hours,
          };
          empSchedule.totalHours += hours;
          empSchedule.totalWorkDays++;
          consecutiveWorkDays[emp.id]++;
          weeklyHours[emp.id][weekIndex] = (weeklyHours[emp.id][weekIndex] || 0) + hours;
        }
      }
    }
  }

  // Validate compliance for each employee
  employeeSchedules.forEach((empSchedule) => {
    const employee = employees.find((e) => e.id === empSchedule.employeeId);
    if (!employee) return;
    
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
