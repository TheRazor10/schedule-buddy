import * as XLSX from 'xlsx';
import { MonthSchedule, Employee, Position, Shift } from '@/types/schedule';
import { getMonthNameEn, getDaysInMonth } from '@/data/bulgarianCalendar2026';

interface ExportOptions {
  schedule: MonthSchedule;
  employees: Employee[];
  positions: Position[];
  shifts: Shift[];
  firmName: string;
}

export function exportScheduleToExcel(options: ExportOptions): void {
  const { schedule, employees, positions, shifts, firmName } = options;
  const { month, year, employeeSchedules } = schedule;

  const daysInMonth = getDaysInMonth(month, year);
  const monthName = getMonthNameEn(month);

  // Helper to get position name
  const getPositionName = (positionId: string) => {
    const position = positions.find((p) => p.id === positionId);
    return position?.name || '—';
  };

  // Helper to get shift abbreviation
  const getShiftAbbr = (shiftId?: string) => {
    if (!shiftId) return 'Р';
    const shift = shifts.find((s) => s.id === shiftId);
    return shift?.abbreviation || 'Р';
  };

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Build header row: Name | Position | Contract | Day 1 | Day 2 | ... | Total Hours | Rest Days | Status
  const headers = [
    'Служител',
    'Позиция',
    'Договор (ч)',
    ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`),
    'Общо часове',
    'Почивни дни',
    'Подпис',
  ];

  // Build data rows
  const data: (string | number)[][] = [];

  employeeSchedules.forEach((empSchedule) => {
    const employee = employees.find((e) => e.id === empSchedule.employeeId);
    if (!employee) return;

    const row: (string | number)[] = [
      `${employee.firstName} ${employee.lastName}`,
      getPositionName(employee.positionId),
      employee.contractHours,
    ];

    // Add each day's entry
    for (let day = 1; day <= daysInMonth; day++) {
      const entry = empSchedule.entries[day];
      if (!entry) {
        row.push('');
      } else if (entry.type === 'holiday') {
        row.push('ПР'); // Празник
      } else if (entry.type === 'rest') {
        row.push('П'); // Почивка
      } else if (entry.type === 'work') {
        row.push(getShiftAbbr(entry.shiftId)); // Shift abbreviation
      }
    }

    // Add totals
    row.push(empSchedule.totalHours);
    row.push(empSchedule.totalRestDays);
    row.push(''); // Empty signature column for employee to sign

    data.push(row);
  });

  // Create worksheet
  const wsData = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths = [
    { wch: 25 }, // Name
    { wch: 20 }, // Position
    { wch: 12 }, // Contract
    ...Array.from({ length: daysInMonth }, () => ({ wch: 5 })), // Days
    { wch: 12 }, // Total Hours
    { wch: 12 }, // Rest Days
    { wch: 15 }, // Signature
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${year}`);

  // Add legend sheet with shifts
  const legendData = [
    ['Легенда', ''],
    ['ПР', 'Празник'],
    ['П', 'Почивка'],
    ['', ''],
    ['Смени:', ''],
    ...shifts.map((s) => [s.abbreviation, `${s.name} (${s.startTime}-${s.endTime})`]),
  ];
  const legendWs = XLSX.utils.aoa_to_sheet(legendData);
  legendWs['!cols'] = [{ wch: 15 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, legendWs, 'Легенда');

  // Generate filename and download
  const filename = `${firmName.replace(/\s+/g, '_')}_График_${monthName}_${year}.xlsx`;
  XLSX.writeFile(wb, filename);
}
